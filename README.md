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

No GitHub Pages o site e estatico. Para cadastro e ranking online entre jogadores, configure o Supabase abaixo.

## Banco online gratis com Supabase

1. Crie um projeto gratis em https://supabase.com.
2. Abra `SQL Editor`, cole o conteudo de `supabase-schema.sql` e execute.
3. Em `Authentication > Providers > Email`, deixe email/senha ativado. Para testes rapidos, voce pode desativar confirmacao de email.
4. Em `Project Settings > API`, copie `Project URL` e `anon public key`.
5. Cole esses valores em `supabase-config.js`:

```js
window.MANGA_LONER_SUPABASE = {
  url: "https://SEU-PROJETO.supabase.co",
  anonKey: "SUA-ANON-PUBLIC-KEY",
};
```

6. Faca commit e push. O GitHub Pages vai atualizar o site.

O XP vem da tabela `chapter_catalog`. Para adicionar ou alterar XP, edite essa tabela no Supabase. Os usuarios so registram capitulos existentes no catalogo, e o ranking soma o XP do banco.

No modo Supabase, o cadastro continua pedindo email, login e senha; para entrar, use o email cadastrado.

## O que foi criado

- Cadastro com nome do perfil, email, login e senha.
- Login por login ou email.
- Senha salva como hash com salt, sem guardar a senha pura.
- Perfil com avatar, XP, level, mangas, capitulos e paginas lidas.
- Aba Mangas para registrar capitulos lidos manualmente.
- Aba Ranking com usuarios ordenados por XP.
- Biblioteca inicial com Gachiakuta, One Piece, Naruto e Alien Headbutt.
- Integracao opcional com Supabase para contas e ranking online.
- Backup JSON na aba Banco.

## Observacao

Abrir direto pelo `index.html` usa banco local do navegador. Abrir pelo `server.py` usa banco central SQLite no computador servidor.
