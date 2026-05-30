from __future__ import annotations

import argparse
import json
import mimetypes
import sqlite3
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "manga_loner.db"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    with connect() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              display_name TEXT NOT NULL,
              email TEXT NOT NULL,
              email_key TEXT NOT NULL UNIQUE,
              login TEXT NOT NULL,
              login_key TEXT NOT NULL UNIQUE,
              password_salt TEXT NOT NULL,
              password_hash TEXT NOT NULL,
              avatar_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS chapters (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              user_manga_key TEXT NOT NULL,
              manga_key TEXT NOT NULL,
              manga_title TEXT NOT NULL,
              cover TEXT NOT NULL DEFAULT '',
              chapter_number INTEGER NOT NULL,
              pages INTEGER NOT NULL,
              xp INTEGER NOT NULL,
              read_at TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              UNIQUE(user_id, manga_key, chapter_number),
              FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_chapters_user_id ON chapters(user_id);
            CREATE INDEX IF NOT EXISTS idx_chapters_read_at ON chapters(read_at);
            """
        )


def user_from_row(row: sqlite3.Row | None) -> dict | None:
    if row is None:
        return None

    return {
        "id": row["id"],
        "displayName": row["display_name"],
        "email": row["email"],
        "emailKey": row["email_key"],
        "login": row["login"],
        "loginKey": row["login_key"],
        "passwordSalt": row["password_salt"],
        "passwordHash": row["password_hash"],
        "avatarId": row["avatar_id"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def chapter_from_row(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "userMangaKey": row["user_manga_key"],
        "mangaKey": row["manga_key"],
        "mangaTitle": row["manga_title"],
        "cover": row["cover"],
        "chapterNumber": row["chapter_number"],
        "pages": row["pages"],
        "xp": row["xp"],
        "readAt": row["read_at"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


class MangaOnlineHandler(SimpleHTTPRequestHandler):
    server_version = "MangaLoner/1.0"

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path.startswith("/api/"):
            self.handle_api_get(parsed.path, parse_qs(parsed.query))
            return

        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/users":
            self.create_user()
            return

        self.send_json({"error": "Rota nao encontrada."}, HTTPStatus.NOT_FOUND)

    def do_PUT(self) -> None:
        parsed = urlparse(self.path)

        if parsed.path.startswith("/api/users/"):
            self.update_user(parsed.path.rsplit("/", 1)[-1])
            return

        if parsed.path.startswith("/api/chapters/"):
            self.upsert_chapter(parsed.path.rsplit("/", 1)[-1])
            return

        self.send_json({"error": "Rota nao encontrada."}, HTTPStatus.NOT_FOUND)

    def handle_api_get(self, path: str, query: dict[str, list[str]]) -> None:
        if path == "/api/health":
            self.send_json({"ok": True, "database": str(DB_PATH.name)})
            return

        if path == "/api/ranking":
            self.get_ranking()
            return

        if path == "/api/users/by-index":
            self.get_user_by_index(query)
            return

        if path.startswith("/api/users/"):
            self.get_user(path.rsplit("/", 1)[-1])
            return

        if path == "/api/chapters":
            self.get_chapters(query)
            return

        if path.startswith("/api/chapters/"):
            self.get_chapter(path.rsplit("/", 1)[-1])
            return

        self.send_json({"error": "Rota nao encontrada."}, HTTPStatus.NOT_FOUND)

    def read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}

        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw)

    def send_json(self, payload: dict | list, status: HTTPStatus = HTTPStatus.OK) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def get_user(self, user_id: str) -> None:
        with connect() as connection:
            row = connection.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

        user = user_from_row(row)
        if not user:
            self.send_json({"error": "Usuario nao encontrado."}, HTTPStatus.NOT_FOUND)
            return

        self.send_json(user)

    def get_user_by_index(self, query: dict[str, list[str]]) -> None:
        index_name = query.get("indexName", [""])[0]
        key = query.get("key", [""])[0]
        column_by_index = {
            "loginKey": "login_key",
            "emailKey": "email_key",
        }
        column = column_by_index.get(index_name)

        if not column or not key:
            self.send_json({"error": "Busca invalida."}, HTTPStatus.BAD_REQUEST)
            return

        with connect() as connection:
            row = connection.execute(f"SELECT * FROM users WHERE {column} = ?", (key,)).fetchone()

        user = user_from_row(row)
        if not user:
            self.send_json({"error": "Usuario nao encontrado."}, HTTPStatus.NOT_FOUND)
            return

        self.send_json(user)

    def create_user(self) -> None:
        payload = self.read_json()
        required = [
            "id",
            "displayName",
            "email",
            "emailKey",
            "login",
            "loginKey",
            "passwordSalt",
            "passwordHash",
            "avatarId",
            "createdAt",
            "updatedAt",
        ]

        if any(not payload.get(field) for field in required):
            self.send_json({"error": "Dados de usuario incompletos."}, HTTPStatus.BAD_REQUEST)
            return

        try:
            with connect() as connection:
                connection.execute(
                    """
                    INSERT INTO users (
                      id, display_name, email, email_key, login, login_key,
                      password_salt, password_hash, avatar_id, created_at, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        payload["id"],
                        payload["displayName"],
                        payload["email"],
                        payload["emailKey"],
                        payload["login"],
                        payload["loginKey"],
                        payload["passwordSalt"],
                        payload["passwordHash"],
                        payload["avatarId"],
                        payload["createdAt"],
                        payload["updatedAt"],
                    ),
                )
        except sqlite3.IntegrityError:
            self.send_json({"error": "Email ou login ja cadastrado.", "code": "ConstraintError"}, HTTPStatus.CONFLICT)
            return

        self.send_json(payload, HTTPStatus.CREATED)

    def update_user(self, user_id: str) -> None:
        payload = self.read_json()
        avatar_id = payload.get("avatarId") or "level-1-luffy"
        display_name = payload.get("displayName") or "Leitor"
        updated_at = payload.get("updatedAt") or utc_now()

        with connect() as connection:
            cursor = connection.execute(
                """
                UPDATE users
                SET display_name = ?, avatar_id = ?, updated_at = ?
                WHERE id = ?
                """,
                (display_name, avatar_id, updated_at, user_id),
            )

        if cursor.rowcount == 0:
            self.send_json({"error": "Usuario nao encontrado."}, HTTPStatus.NOT_FOUND)
            return

        self.get_user(user_id)

    def get_chapters(self, query: dict[str, list[str]]) -> None:
        user_id = query.get("userId", [""])[0]
        if not user_id:
            self.send_json({"error": "Usuario obrigatorio."}, HTTPStatus.BAD_REQUEST)
            return

        with connect() as connection:
            rows = connection.execute(
                "SELECT * FROM chapters WHERE user_id = ? ORDER BY read_at DESC",
                (user_id,),
            ).fetchall()

        self.send_json([chapter_from_row(row) for row in rows])

    def get_chapter(self, chapter_id: str) -> None:
        with connect() as connection:
            row = connection.execute("SELECT * FROM chapters WHERE id = ?", (chapter_id,)).fetchone()

        if not row:
            self.send_json({"error": "Capitulo nao encontrado."}, HTTPStatus.NOT_FOUND)
            return

        self.send_json(chapter_from_row(row))

    def upsert_chapter(self, chapter_id: str) -> None:
        payload = self.read_json()
        required = [
            "id",
            "userId",
            "userMangaKey",
            "mangaKey",
            "mangaTitle",
            "chapterNumber",
            "pages",
            "xp",
            "readAt",
            "createdAt",
            "updatedAt",
        ]

        if chapter_id != payload.get("id") or any(payload.get(field) in (None, "") for field in required):
            self.send_json({"error": "Dados de capitulo incompletos."}, HTTPStatus.BAD_REQUEST)
            return

        with connect() as connection:
            connection.execute(
                """
                INSERT INTO chapters (
                  id, user_id, user_manga_key, manga_key, manga_title, cover,
                  chapter_number, pages, xp, read_at, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  user_id = excluded.user_id,
                  user_manga_key = excluded.user_manga_key,
                  manga_key = excluded.manga_key,
                  manga_title = excluded.manga_title,
                  cover = excluded.cover,
                  chapter_number = excluded.chapter_number,
                  pages = excluded.pages,
                  xp = excluded.xp,
                  read_at = excluded.read_at,
                  updated_at = excluded.updated_at
                """,
                (
                    payload["id"],
                    payload["userId"],
                    payload["userMangaKey"],
                    payload["mangaKey"],
                    payload["mangaTitle"],
                    payload.get("cover") or "",
                    int(payload["chapterNumber"]),
                    int(payload["pages"]),
                    int(payload["xp"]),
                    payload["readAt"],
                    payload["createdAt"],
                    payload["updatedAt"],
                ),
            )

        self.send_json(payload)

    def get_ranking(self) -> None:
        with connect() as connection:
            rows = connection.execute(
                """
                SELECT
                  u.id,
                  u.display_name,
                  u.login,
                  u.avatar_id,
                  u.created_at,
                  COALESCE(SUM(c.xp), 0) AS total_xp,
                  COALESCE(SUM(c.pages), 0) AS pages,
                  COUNT(c.id) AS chapters,
                  COUNT(DISTINCT c.manga_key) AS mangas,
                  MAX(c.read_at) AS last_read_at
                FROM users u
                LEFT JOIN chapters c ON c.user_id = u.id
                GROUP BY u.id
                ORDER BY total_xp DESC, chapters DESC, pages DESC, last_read_at DESC
                """
            ).fetchall()

        ranking = []
        for position, row in enumerate(rows, start=1):
            ranking.append(
                {
                    "position": position,
                    "id": row["id"],
                    "displayName": row["display_name"],
                    "login": row["login"],
                    "avatarId": row["avatar_id"],
                    "createdAt": row["created_at"],
                    "totalXp": row["total_xp"],
                    "pages": row["pages"],
                    "chapters": row["chapters"],
                    "mangas": row["mangas"],
                    "lastReadAt": row["last_read_at"],
                }
            )

        self.send_json(ranking)


def main() -> None:
    parser = argparse.ArgumentParser(description="Servidor local do Manga Loner.")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()

    mimetypes.add_type("text/javascript", ".js")
    init_db()

    def handler(*handler_args, **handler_kwargs):
        return MangaOnlineHandler(*handler_args, directory=str(BASE_DIR), **handler_kwargs)

    server = ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Manga Loner em http://{args.host}:{args.port}/")
    print(f"Banco: {DB_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()
