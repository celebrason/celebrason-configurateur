
# Ajout Résumé + Envoi e-mail (Netlify Functions)

## Fichiers fournis
- `index-with-summary-email.html` : votre HTML patché (section Résumé + formulaire e-mail + JS intégré).
- `netlify/functions/send-summary.js` : fonction serverless d'envoi avec Resend.
- `netlify.toml` : config Netlify (bundler, modules externes).
- `package.json` : dépendance `resend`.

## Étapes Netlify
1. Déployer ces fichiers à la racine de votre site (respecter l'arborescence `netlify/functions`).
2. Dans Netlify → *Site settings* → *Build & deploy* → *Environment* → *Environment variables*, ajouter :
   - `RESEND_API_KEY` = **votre** clé API Resend
   - `DEFAULT_TO` = `contact@celebrason.fr` (optionnel, par défaut cette valeur est utilisée)
   - `DEFAULT_FROM` = une adresse expéditrice validée chez Resend (ex. `devis@celebrason.fr`)
3. Lancer un build/redeploy de votre site.

## Utilisation
- Dans la page, cliquez d'abord sur **Générer le résumé**, puis **Envoyer le récapitulatif**.
- Le prospect reçoit une copie, et `contact@celebrason.fr` reçoit une copie interne.

## Remarques
- L'impression (PDF) ne sort **que** la section Résumé.
- Le code lit automatiquement les cases cochées et les sélections, en regroupant par sections `<h2>`.
