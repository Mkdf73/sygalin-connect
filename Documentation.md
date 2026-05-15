# Documentation du Projet: Sygalin Connect (Plateforme SMS)

Bienvenue sur la documentation de la plateforme d'envoi de SMS B2B **Sygalin Connect**.

## Architecture Haut Niveau

Le projet est divisé en deux grandes parties : un **Backend** (API Python) et un **Frontend** (Interface React).
Les deux communiquent via des requêtes HTTP (Axios) sécurisées par des Jetons (JWT).

## ⚙️ Installation de Zéro (Résumé)

Pour lancer le projet sur une machine neuve :
1.  Installer **Python 3.10+** (depuis python.org).
2.  Installer **Node.js (LTS)** (depuis nodejs.org).
3.  **Backend** : Aller dans `backend`, créer un `venv`, lancer `pip install -r requirements.txt`, copier `.env.example` en `.env` et lancer `uvicorn app.main:app --reload`.
4.  **Frontend** : Aller dans `frontend`, lancer `npm install`, copier `.env.example` en `.env` et lancer `npm run dev`.

*Pour un guide plus détaillé étape par étape, consultez le fichier [README.md](file:///c:/Users/USER/.gemini/antigravity/scratch/Bug%20SMS/README.md) à la racine.*

### 1. Backend (FastAPI / Python 3.13)
*   **Technologie** : API ultra rapide bâtie sur **FastAPI**.
*   **Base de Données** : **SQLite** pour le moment (fichier `sygalin_connect.db` situé dans le dossier backend). Piloté via **SQLAlchemy** (ORM).
*   **Sécurité** : 
    *   Mots de passe hachés avec **Bcrypt**.
    *   Authentification par **JWT** (*JSON Web Tokens*). Le jeton expire au bout de 15 minutes, avec un *Refresh Token* utilisable pendant 7 jours.
*   **Structure** :
    *   `app/models/` : Contient la définition des tables en base de données.
    *   `app/schemas/` : Contient la définition et la validation des données qui rentrent et sortent de l'API via **Pydantic**.
    *   `app/routers/` : Les *endpoints* HTTP (ex: `/api/auth/login`, `/api/admin/metrics`, etc.).
    *   `app/database.py` : Connexion à SQLite.

### 2. Frontend (React / Vite / Tailwind)
*   **Technologie** : Crée avec **Vite**, fournissant **React 18** et **TypeScript**.
*   **Design** : **Tailwind CSS V4** (premium, glassmorphism, flat design).
*   **Gestion de l'État** : **Zustand** (store léger et performant). 
    *   `src/store/useAuthStore.ts` : Stocke le token et le profil de l'utilisateur connecté dans le `localStorage` de votre navigateur. Cela vous évite de vous reconnecter à chaque rafraîchissement.
*   **Structure** :
    *   `src/components/` : Composants réutilisables (`Button`, `Card`, `Sidebar`) conçus pour être le plus génériques possibles.
    *   `src/pages/` : Vues entières. Séparées en `admin/`, `client/` et `auth/`.
    *   `src/lib/axios.ts` : Intercepteur Axios. Il ajoute automatiquement votre jeton "Bearer" à chaque requête que vous faites vers le backend !

---

## Fonctionnement des Rôles (RBAC)

L'application dispose de deux rôles : `admin` et `client`.
Certains espaces clients requièrent d'abord une approbation de l'administrateur. 
1. Quand un client s'inscrit (`/auth/register`), son statut en DB passe à `PENDING`.
2. L'administrateur le voit et l'active.

---

## Comment tester et vous connecter ?

Des comptes de tests avec de la data fictive ont été créés pour vous faciliter la vie ! Voici vos identifiants :

### Espace Administrateur
> **Email :** `admin@sygalin.com`
> **Mot de passe :** `Admin123!`

### Espace Client (Déjà validé avec un solde de 2500 SMS)
> **Email :** `client@example.com`
> **Mot de passe :** `Client123!`

---

## Prochaines Étapes Techniques (à finaliser)

- **Mode Production** : Remplacer SQLite par PostgreSQL via un `.env`.
- **Intégration Sygalin Réelle** : Remplacer le "Simulateur SMS" dans le backend par l'API officielle d'ingénierie télécom de l'entreprise.
