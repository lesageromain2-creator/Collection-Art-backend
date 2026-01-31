# Erreur : "password authentication failed for user postgres" (28P01)

Cette erreur signifie que le **mot de passe** utilisé dans `DATABASE_URL` (fichier `backend/.env`) ne correspond pas au mot de passe de la base PostgreSQL Supabase.

## Correction en 3 étapes

### 1. Récupérer le bon mot de passe Supabase

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard) et ouvrez votre projet.
2. **Settings** (engrenage) → **Database**.
3. Dans la section **Database password** :
   - Soit vous connaissez déjà le mot de passe défini à la création du projet.
   - Soit cliquez sur **Reset database password**, choisissez un nouveau mot de passe, et **notez-le**.

### 2. Récupérer l’URL de connexion

Toujours dans **Settings → Database** :

- Descendez jusqu’à **Connection string**.
- Onglet **URI**.
- Copiez l’URL du type :  
  `postgresql://postgres.[ref]:[VOTRE-MOT-DE-PASSE]@aws-0-[region].pooler.supabase.com:6543/postgres`

### 3. Mettre à jour `backend/.env`

Ouvrez `backend/.env` et définissez `DATABASE_URL` avec l’URL copiée, en vous assurant que le **mot de passe** est le bon (celui de l’étape 1).

**Si le mot de passe contient des caractères spéciaux**, encodez-les pour l’URL :

| Caractère | Remplacer par |
|-----------|----------------|
| `@`       | `%40`          |
| `#`       | `%23`          |
| `?`       | `%3F`          |
| `&`       | `%26`          |
| `=`       | `%3D`          |
| `%`       | `%25`          |

Exemple : mot de passe `Mon#Pass@123` → dans l’URL : `Mon%23Pass%40123`.

Enregistrez `backend/.env`, puis redémarrez le serveur backend :

```bash
cd backend
npm run dev
```

La connexion à la base devrait alors fonctionner.
