# 🚀 Sygalin Connect - Guide d'Installation de Zéro

Bienvenue ! Ce guide vous explique comment installer et lancer le projet **Sygalin Connect** sur un ordinateur n'ayant aucun outil de développement installé.

---

## 🛠️ Étape 1 : Installation des outils de base

Avant de commencer, vous devez installer deux outils essentiels :

### 1. Python (Le moteur du Backend)
- Rendez-vous sur [python.org/downloads](https://www.python.org/downloads/).
- Téléchargez la dernière version stable (Python 3.10 ou supérieure).
- **IMPORTANT :** Lors de l'installation sous Windows, assurez-vous de cocher la case **"Add Python to PATH"**.

### 2. Node.js (Le moteur du Frontend)
- Rendez-vous sur [nodejs.org](https://nodejs.org/).
- Téléchargez et installez la version **LTS** (recommandée).
- Suivez l'installeur par défaut.

---

## 🔌 Étape 2 : Configuration du Backend (L'API)

1. Ouvrez un terminal (CMD ou PowerShell sur Windows) et allez dans le dossier du projet.
2. Déplacez-vous dans le dossier `backend` :
   ```bash
   cd backend
   ```
3. Créez un environnement virtuel (pour isoler les bibliothèques) :
   ```bash
   python -m venv venv
   ```
4. Activez l'environnement :
   - **Windows :** `.\venv\Scripts\activate`
   - **Mac/Linux :** `source venv/bin/activate`
5. Installez les bibliothèques nécessaires :
   ```bash
   pip install -r requirements.txt
   ```
6. Préparez le fichier de configuration :
   - Copiez le fichier `.env.example` et renommez-le en `.env`.
   - Par défaut, il utilise une base de données SQLite (aucun serveur SQL à installer).
7. Lancez le serveur API :
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0
   ```
   *L'API sera accessible sur `http://localhost:8000/api/v1` et sur le réseau local.*

---

## 🎨 Étape 3 : Configuration du Frontend (L'Interface)

1. Ouvrez un **nouveau** terminal et allez dans le dossier `frontend` :
   ```bash
   cd frontend
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Préparez le fichier de configuration :
   - Copiez le fichier `.env.example` et renommez-le en `.env`.
4. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```
   *L'interface sera accessible sur `http://localhost:5173`.*

---

## 🔐 Étape 4 : Connexion à l'application

Une fois les deux serveurs lancés, ouvrez votre navigateur sur `http://localhost:5173`.

### Identifiants de Test :

| Rôle | Email | Mot de passe |
| :--- | :--- | :--- |
| **Administrateur** | `admin@sygalin.com` | Valeur de `SYGALIN_ADMIN_PASSWORD` dans `.env` |
| **Client** | `client@example.com` | Valeur de `SYGALIN_TEST_CLIENT_PASSWORD` si vous creez un compte de test |

---

## 🔧 Dépannage
- **Erreur Python non trouvé :** Vérifiez que vous avez bien coché "Add to PATH" lors de l'installation.
- **Tableaux vides :** Assurez-vous que le backend tourne bien au port 8000.
- **Port déjà utilisé :** Si le port 8000 est pris, l'API ne se lancera pas. Vérifiez vos autres logiciels.

---
## 📧 Envoi d'e‑mail de test

Le projet inclut maintenant un endpoint **/send-test-email** qui permet d’envoyer un e‑mail de test.

### Configuration SMTP

Ajoutez les variables suivantes dans votre fichier `.env` (ou `.env.example`) :

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

> **⚠️** Pour Gmail, créez un **mot de passe d’application** et activez l’accès aux applications moins sécurisées ou utilisez OAuth.

### Tester l’endpoint

```bash
curl -X POST http://localhost:8000/api/v1/send-test-email \
     -H "Content-Type: application/json" \
     -d '{"email":"votre_adresse@gmail.com"}'
```

Vous devez recevoir une réponse :

```json
{"detail":"Email sent successfully"}
```

et l’e‑mail apparaîtra dans la boîte de réception du destinataire.

### Débogage

- Vérifiez les logs du serveur pour les éventuelles erreurs d’authentification.
- Assurez‑vous que le port 465 est ouvert et que les identifiants sont corrects.


*Besoin d'aide supplémentaire ? Consultez le fichier `Documentation.md` pour les détails techniques !*
