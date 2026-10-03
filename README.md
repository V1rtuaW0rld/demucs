# Demucs Web & Vocal Enhancer Studio 🎵✨

Une interface web moderne et complète pour la séparation de pistes audio (stems) par IA et le traitement de voix studio, propulsée par **Demucs v4**, **Mel-Band Roformer**, **MDX-Net** et le moteur DSP **Pedalboard**.

---
<img width="1389" height="930" alt="image" src="https://github.com/user-attachments/assets/ff7d9cde-dfae-4b83-90a5-af3863df27a0" />

## 🌟 Fonctionnalités

### 1. Séparation de sources audio (Stem Separation)
* **Moteurs Demucs v4 (Meta AI)** :
  * `htdemucs_ft` : Le modèle hybride Transformer le plus précis pour extraire Voix, Batterie, Basse et Reste.
  * `htdemucs_6s` : Séparation en 6 pistes (Voix, Batterie, Basse, Guitare, Piano, Reste).
  * Mode 2 stems rapide (Voix / Instrumental).
* **Modèles avancés (via audio-separator)** :
  * Prise en charge des modèles de pointe **Mel-Band Roformer**, **MDX** et **MDXC** (`.onnx`, `.ckpt`).
  * Accélération GPU NVIDIA (CUDA) complète.

### 2. Studio d'amélioration vocale (Vocal Enhancer)
Un onglet dédié pour sublimer les voix (fichiers bruts ou pistes vocales fraîchement isolées) :
* **De-Reverb (Suppression d'écho)** :
  * Modèle **Mel-Band Roformer De-Reverb** pour retirer l'acoustique de pièce et l'écho, offrant une voix « sèche » de qualité cabine de studio insonorisée.
* **Voice EQ (Égaliseur Studio)** :
  * Filtre coupe-bas à 80 Hz pour supprimer les bruits sourds et grondements de micro.
  * **Warmth (250 Hz)** : Ajuste la chaleur, le coffre et la rondeur de la voix.
  * **Harshness Cut (4 kHz)** : Réduit le côté agressif, métallique ou « son de boîte ».
  * **Air / Presence (10 kHz)** : Apporte de la clarté, du souffle et de la présence haute définition.
* **Dynamics (Compresseur & Limiteur)** :
  * Compresseur paramétrique (Seuil et Ratio ajustables) pour densifier et stabiliser le niveau de voix.
  * Limiteur de crête automatique réglé à -1.0 dB pour prévenir toute distorsion/écrêtage.

### 3. Interface Web & Lecteur interactif
* Lecteur multipiste intégré permettant de muter, isoler (solo) ou télécharger chaque stem indépendamment.
* Amélioration directe en 1 clic d'une voix isolée depuis la page de résultat.
* Stack réactive et légère : **Bun**, **Elysia**, **React 19**, **Tailwind CSS** et base de données **SQLite / Drizzle ORM**.

---

## 🚀 Démarrage rapide avec Docker

L'application est entièrement conteneurisée (Frontend Bun + Backend Python CUDA).

### Prérequis
* [Docker Desktop](https://www.docker.com/) ou Docker Engine sous Linux.
* Pour l'accélération GPU : Une carte graphique NVIDIA avec [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html).

### Lancement

1. Clonez ce dépôt :
```bash
git clone https://github.com/V1rtuaW0rld/demucs.git
cd demucs
```

2. Créez votre fichier `.env` si nécessaire (un modèle `.env.example` est fourni) :
```bash
cp .env.example .env
```

3. Lancez les conteneurs :
```bash
docker compose up -d --build
```

4. Ouvrez votre navigateur sur :
```
http://localhost:3033
```
*(ou sur le port configuré dans votre `docker-compose.yml`)*

---

## ⚙️ Configuration & Variables d'environnement

### Service UI (`demucs-web`)
* `PORT` : Port interne d'écoute de l'interface (par défaut `3000`, mappé sur `3033` dans `docker-compose.yml`).
* `SECRET` : Clé secrète pour signer les jetons d'authentification des sessions.
* `DEMUCS_API` : URL du serveur backend (par défaut `http://demucs-backend:8000`).
* `DEMUCS_API_KEY` : Clé API pour authentifier les requêtes backend.

### Service Moteur (`demucs-backend`)
* `MODEL` : Modèle de séparation par défaut (ex. `htdemucs_ft`).
* `API_URL` : URL de rappel de l'UI pour télécharger/téléverser les fichiers (`http://demucs-web:3000`).

---

## 🛠️ Développement local

Pour exécuter l'interface hors conteneur avec [Bun](https://bun.sh) :

```bash
bun install
bun run dev
```

---

## 🙏 Remerciements & Crédits

Ce projet s'appuie sur d'incroyables projets open-source. Un grand merci à leurs créateurs et contributeurs :

* **[Podter/demucs-web](https://github.com/Podter/demucs-web)** : Le projet d'origine dont ce dépôt est un fork enrichi. Un immense merci à **Podter** pour l'architecture initiale propre et moderne de l'interface web.
* **[Demucs (Meta AI Research)](https://github.com/facebookresearch/demucs)** développé par Alexandre Défossez et son équipe.
* **[audio-separator](https://github.com/nomadkaraoke/python-audio-separator)** pour l'intégration des modèles Roformer, MDX et VR.
* **[Pedalboard (Spotify)](https://github.com/spotify/pedalboard)** pour le traitement du signal audio et les effets studio haute fidélité.
* **[LitServe (Lightning AI)](https://github.com/Lightning-AI/LitServe)** pour le déploiement performant de modèles d'IA en Python.

---

## 📄 Licence

Ce projet est distribué sous licence [MIT](LICENSE).
