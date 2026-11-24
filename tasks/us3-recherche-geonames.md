# us3-recherche-geonames

**En tant qu'** utilisateur de la carte,
**je veux** taper le nom d'un lieu ou une adresse et choisir parmi des suggestions,
**afin de** centrer la carte dessus sans avoir à la déplacer à la main.

## Contexte

La carte s'ouvre sur les Alpes, au zoom 5. Aujourd'hui, pour aller voir un endroit précis, il faut faire glisser la carte et zoomer à la main. La recherche s'appuie sur les services web de GeoNames.

## Critères d'acceptation

1. Un champ « Rechercher un lieu ou une adresse » est affiché dans la barre d'en-tête, à droite du titre.
2. Les suggestions sont demandées à partir de 3 caractères saisis, 300 ms après la dernière frappe. Une saisie continue ne déclenche qu'une seule recherche, à la fin. En dessous de 3 caractères, aucune recherche n'est faite et la liste se ferme.
3. Seules les suggestions de la dernière saisie sont affichées. Une réponse plus ancienne qui arrive en retard est ignorée.
4. La liste affiche au plus 8 suggestions. Chacune donne le nom, le type (« Pays », « Région », « Ville », « Lieu » ou « Adresse ») et son contexte (région et pays). Les noms sont en français quand GeoNames les connaît.
5. La recherche couvre les lieux (pays, régions, villes, sommets, lacs…) et les adresses. Une adresse trouvée apparaît en tête de liste.
6. La liste se pilote au clavier : flèches haut et bas pour se déplacer, Entrée pour choisir, Échap pour fermer. Un clic choisit aussi une suggestion. Le champ et la liste suivent le motif ARIA « combobox ».
7. Choisir une suggestion déplace la carte :
   - si GeoNames fournit une emprise (pays, régions), la carte s'ajuste à cette emprise ;
   - sinon, la carte se centre sur le point, au zoom 12 pour un lieu, au zoom 17 pour une adresse.

   Le champ affiche alors le nom choisi et la liste se ferme.
8. Sans suggestion, la liste indique « Aucun résultat ».
9. Si GeoNames est injoignable ou refuse la requête (quota dépassé, compte invalide), le champ indique « Recherche indisponible ». Le reste de l'application continue de fonctionner. GeoNames signale ces refus par une réponse HTTP 200 qui contient un objet `status`, pas par un code d'erreur HTTP.
10. Le nom d'utilisateur GeoNames est lu dans la variable d'environnement `VITE_GEONAMES_USERNAME`. Si elle est absente, le champ est désactivé et indique « Recherche non configurée ». Le nom d'utilisateur n'est jamais écrit dans le code ni committé.
11. Un bouton « Effacer » vide le champ et ferme la liste, sans déplacer la carte.
12. Le fond de plan, l'emprise saisie et les couches affichées ne changent pas quand on recherche un lieu.
13. Les libellés de l'interface sont en français.

## Notes techniques

Vérifié le 2026-11-24 :

- **Lieux** : `https://secure.geonames.org/searchJSON`. L'hôte `secure.geonames.org` répond en HTTPS avec `Access-Control-Allow-Origin: *`. Paramètres utiles : `name_startsWith=<saisie>`, `orderby=relevance`, `maxRows=8`, `lang=fr`, `inclBbox=true` (emprise `west/south/east/north` quand elle existe) et `username=<compte>`. Le type se déduit de `fcl`/`fcode` : `PCL*` → Pays, autre `A` → Région, `P` → Ville, le reste → Lieu.
- **Adresses** : `https://secure.geonames.org/geoCodeAddressJSON?q=<saisie>&username=<compte>`, qui renvoie au plus une adresse. Ce service ne couvre qu'une liste de pays, dont la France, la Suisse, l'Espagne, l'Autriche, les Pays-Bas et les États-Unis (liste complète : <https://www.geonames.org/maps/addresses.html>). **Le format de sa réponse n'a pas pu être vérifié**, faute de compte. Le valider sur une réponse réelle avant d'écrire le parseur.
- **Erreurs** : par exemple `{"status":{"message":"the daily limit of 20000 credits for demo has been exceeded…","value":18}}`. Codes connus : 10 (authentification), 18, 19 et 20 (quotas journalier, horaire et hebdomadaire).
- **Compte** : le compte public `demo` a épuisé son quota (vérifié), il ne doit pas être utilisé. Un compte gratuit se crée sur <https://www.geonames.org/login>, puis il faut activer les services web gratuits sur la page du compte. Le nom d'utilisateur va dans `.env.local`, qu'il faut ajouter au `.gitignore` (seul `.env` y est aujourd'hui).
- **Architecture** : l'appel HTTP à GeoNames vit dans un adaptateur (`src/adapters/`) derrière un port. La temporisation (300 ms), le seuil de 3 caractères, l'abandon des réponses périmées, le classement et le choix du zoom sont de la logique testable dans `src/domain` et `src/application`.
- **Tests de bout en bout** : interceptés (`page.route`) avec des réponses GeoNames enregistrées. Aucun appel réel à GeoNames dans les tests.

## Hors périmètre

- Marqueur ou info-bulle sur le lieu trouvé.
- Historique des recherches, favoris.
- Géocodage inverse (clic sur la carte → adresse).
- Recherche d'adresses dans les pays que GeoNames ne couvre pas.
