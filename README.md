# Manga Loner

App local para cadastro de usuarios, perfil, mangas lidos, historico, XP e level.

## Como abrir no seu PC

Abra `index.html` no navegador. O banco usa IndexedDB, entao os dados ficam salvos no proprio navegador.

## Como abrir para outros computadores

Rode o servidor:

```powershell
& "C:\Users\Rodrigo Loner\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" "D:\Manga Online\server.py" --host 0.0.0.0 --port 4173
```

Depois acesse pelo IP do computador servidor, por exemplo `http://192.168.0.10:4173/`.
Nesse modo os dados ficam no arquivo `manga_loner.db` e todos usam o mesmo ranking.

## Como publicar no GitHub Pages

Publique esta pasta como repositorio pelo GitHub Desktop. Depois do primeiro push na branch `main`, o workflow em `.github/workflows/pages.yml` envia o site para GitHub Pages.

No GitHub Pages o site e estatico. Para cadastro e ranking online entre jogadores, configure o Firebase abaixo.

## Banco online gratis com Firebase

1. Crie um projeto gratis em https://console.firebase.google.com.
2. Ative `Authentication > Sign-in method > Email/Password`.
3. Ative `Firestore Database`.
4. Em `Firestore Database > Rules`, cole o conteudo de `firebase-firestore.rules` e publique.
5. Em `Project settings > General > Your apps`, crie um app Web e copie o `firebaseConfig`.
6. Cole esses valores em `firebase-config.js`:

```js
window.MANGA_LONER_FIREBASE_CONFIG = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
};
```

7. Faca commit e push. O GitHub Pages vai atualizar o site.

O XP vem do catalogo em `app.js`. Os usuarios so clicam em `Registrar Cap. 1`, `Registrar Cap. 2` e assim por diante. Para adicionar ou alterar XP, edite `defaultChapterCatalog` em `app.js` e publique novamente.

No modo Firebase, o cadastro continua pedindo email, login e senha; para entrar, use o email cadastrado.

## O que foi criado

- Cadastro com nome do perfil, email, login e senha.
- Login por login ou email.
- Senha salva como hash com salt, sem guardar a senha pura.
- Perfil com avatar, XP, level, mangas, capitulos e paginas lidas.
- Aba Mangas para registrar capitulos lidos manualmente.
- Aba Ranking com usuarios ordenados por XP.
- Biblioteca inicial com Gachiakuta, One Piece, Naruto e Alien Headbutt.
- Integracao opcional com Firebase para contas e ranking online.
- Backup JSON na aba Banco.

## Observacao

Abrir direto pelo `index.html` usa banco local do navegador. Abrir pelo `server.py` usa banco central SQLite no computador servidor.
