# Manga Online DB

App local para cadastro de usuarios, perfil, mangas lidos, historico, XP e level.

## Como abrir no seu PC

Abra `index.html` no navegador. O banco usa IndexedDB, entao os dados ficam salvos no proprio navegador.

## Como abrir para outros computadores

Rode o servidor:

```powershell
& "C:\Users\Rodrigo Loner\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" "D:\Manga Online\server.py" --host 0.0.0.0 --port 4173
```

Depois acesse pelo IP do computador servidor, por exemplo `http://192.168.0.10:4173/`.
Nesse modo os dados ficam no arquivo `manga_online.db` e todos usam o mesmo ranking.

## Como publicar no GitHub Pages

Publique esta pasta como repositorio pelo GitHub Desktop. Depois do primeiro push na branch `main`, o workflow em `.github/workflows/pages.yml` envia o site para GitHub Pages.

No GitHub Pages o site e estatico: cadastro, perfil e mangas ficam salvos no navegador de cada pessoa. O ranking compartilhado com SQLite funciona apenas quando o `server.py` esta rodando em um computador/servidor.

## O que foi criado

- Cadastro com nome do perfil, email, login e senha.
- Login por login ou email.
- Senha salva como hash com salt, sem guardar a senha pura.
- Perfil com avatar, XP, level, mangas, capitulos e paginas lidas.
- Aba Mangas para registrar capitulos lidos manualmente.
- Aba Ranking com usuarios ordenados por XP.
- Biblioteca inicial com Gachiakuta, One Piece, Naruto e Alien Headbutt.
- Backup JSON na aba Banco.

## Observacao

Abrir direto pelo `index.html` usa banco local do navegador. Abrir pelo `server.py` usa banco central SQLite no computador servidor.
