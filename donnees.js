/* donnees.js - Base de donnees des plantes et des routes */

// Emojis pour les 30 routes
const plantEmojis = [
    '🌿', '🌱', '🌵', '🍀', '🍄', '🌴', '🌸', '🍂', '🌾', '🌻',
    '🌹', '🌺', '🌼', '🌷', '🌹', '🌻', '🌼', '🌷', '🌹', '🌻',
    '🍃', '🍁', '🍂', '🍃', '🍁', '🍂', '🍃', '🍁', '🍂', '🌳'
];

// Themes de fond (degrades CSS) pour les 30 routes
const routeThemes = [
    'linear-gradient(135deg, #051a05 0%, #0a2e0a 100%)', // R1: Vert Toxique
    'linear-gradient(135deg, #1a051a 0%, #2e0a2e 100%)', // R2: Violet Radioactif
    'linear-gradient(135deg, #050a1a 0%, #0a1e2e 100%)', // R3: Bleu Cyber-Labo
    'linear-gradient(135deg, #1a0505 0%, #2e0a0a 100%)', // R4: Rouge Biohazard
    'linear-gradient(135deg, #1a1a05 0%, #2e2e0a 100%)', // R5: Jaune Acide
    'linear-gradient(135deg, #051a1a 0%, #0a2e2e 100%)', // R6: Cyan Profond
    'linear-gradient(135deg, #1a0510 0%, #2e0a1e 100%)', // R7: Magenta Sombre
    'linear-gradient(135deg, #050505 0%, #1a1a1a 100%)', // R8: Gris Cendre
    'linear-gradient(135deg, #10051a 0%, #1e0a2e 100%)', // R9: Indigo
    'linear-gradient(135deg, #051a05 0%, #1a3a1a 100%)', // R10: Vert Foret
    'linear-gradient(135deg, #1a0505 0%, #3a0a0a 100%)', // R11: Rouge Sang
    'linear-gradient(135deg, #051a1a 0%, #0a3a3a 100%)', // R12: Vert Marine
    'linear-gradient(135deg, #1a1a05 0%, #3a3a0a 100%)', // R13: Ocre
    'linear-gradient(135deg, #05051a 0%, #0a0a3a 100%)', // R14: Bleu Nuit
    'linear-gradient(135deg, #1a051a 0%, #3a0a3a 100%)', // R15: Violet Nuit
    'linear-gradient(135deg, #051a05 0%, #002200 100%)', // R16: Vert Fonce
    'linear-gradient(135deg, #1a0505 0%, #440a0a 100%)', // R17: Rouge Brique
    'linear-gradient(135deg, #051a1a 0%, #003333 100%)', // R18: Teal
    'linear-gradient(135deg, #1a1a05 0%, #44440a 100%)', // R19: Moutarde
    'linear-gradient(135deg, #05051a 0%, #000044 100%)', // R20: Bleu Roi
    'linear-gradient(135deg, #1a051a 0%, #440a44 100%)', // R21: Pourpre
    'linear-gradient(135deg, #051a05 0%, #004400 100%)', // R22: Vert Emeraude
    'linear-gradient(135deg, #1a0505 0%, #550a0a 100%)', // R23: Rouge Feu
    'linear-gradient(135deg, #051a1a 0%, #005555 100%)', // R24: Turquoise
    'linear-gradient(135deg, #1a1a05 0%, #55550a 100%)', // R25: Or
    'linear-gradient(135deg, #05051a 0%, #000055 100%)', // R26: Bleu Cobalt
    'linear-gradient(135deg, #1a051a 0%, #550a55 100%)', // R27: Fuchsia
    'linear-gradient(135deg, #051a05 0%, #006600 100%)', // R28: Vert Lime
    'linear-gradient(135deg, #1a0505 0%, #660a0a 100%)', // R29: Rouge Cerise
    'linear-gradient(135deg, #000000 0%, #111111 100%)'  // R30: Noir Absolu
];

const plantNames = [
    "Bulbe de Sphaigne Neon", "Fougere Radioactive", "Champignon Bioluminescent", "Liane Acide",
    "Fleur Carnivore Synthetique", "Mousse Toxique", "Racine Electrique", "Petale de Verre",
    "Bourgeon de Plasma", "Algue Mutante", "Cactus Laser", "Orchidee Cybernetique",
    "Saule Pleureur de Sang", "Chene de Fer", "Rose de Feu", "Tulipe Glacee",
    "Palmier de Soufre", "Bambou de Diamant", "Vigne de l'Enfer", "Cactus d'Obsidienne",
    "Lichen de l'Espace", "Fougere Temporelle", "Fleur du Chaos", "Arbre de la Vie",
    "Racine du Monde", "Bourgeon Stellaire", "Petale de l'Aube", "Liane Celeste",
    "Fougere Primordiale", "L'Arborescence-Mère"
];

const sapTypes = [
    "Seve de Sphaigne", "Seve de Fougere", "Seve de Champignon", "Seve de Liane",
    "Nectar Carnivore", "Seve de Mousse", "Seve Electrique", "Seve de Verre",
    "Plasma Vegetal", "Seve d'Algue", "Seve de Cactus", "Seve Cyber",
    "Sang de Saule", "Seve de Fer", "Seve de Feu", "Seve de Glace",
    "Seve de Soufre", "Seve de Diamant", "Seve Infernale", "Seve d'Obsidienne",
    "Seve Spatiale", "Seve Temporelle", "Seve Chaotique", "Seve de Vie",
    "Seve Mondiale", "Seve Stellaire", "Seve de l'Aube", "Seve Celeste",
    "Seve Primordiale", "Seve d'Emeraude"
];

// Construction de la base de donnees globale
const PLANT_DB = [];

for (let i = 0; i < 30; i++) {
    // Formule PV : Base 50, multipliee par 1.5 a chaque route
    let hp = Math.floor(50 * Math.pow(1.5, i));
    if (hp > 15000000 && i === 29) hp = 15000000; 

    // Valeur en Golds a la vente : progression douce liee a la rarete (index de route)
    const goldValue = Math.max(1, Math.floor(5 * Math.pow(1.12, i)));

    // Valeur en XP a la destruction : meme principe, courbe un peu plus marquee
    const xpValue = Math.max(1, Math.floor(3 * Math.pow(1.15, i)));

    PLANT_DB.push({
        id: i,
        name: plantNames[i],
        sapName: sapTypes[i],
        maxHp: hp,
        pv: hp, // Ajout de la propriete PV dynamique pour le combat
        icon: plantEmojis[i], // C'est ici que l'emoji est stocke
        theme: routeThemes[i],
        goldValue: goldValue, // Valeur de vente en Golds (plus la plante est rare, plus elle vaut cher)
        xpValue: xpValue // XP gagnee en detruisant cette plante (plus elle est rare, plus elle en donne)
    });
}

// --- NOUVEAU : Configuration des Routes ---
// Chaque route contient la plante de cette route et la plante precedente (si elle existe)
const ROUTE_CONFIG = [];

for (let i = 1; i <= 30; i++) {
    const allowedPlants = [];

    if (i === 1) {
        allowedPlants.push(PLANT_DB[0].name);
    } else {
        allowedPlants.push(PLANT_DB[i - 1].name);
        if (i - 2 >= 0) {
            allowedPlants.push(PLANT_DB[i - 2].name);
        }
    }

    ROUTE_CONFIG.push({
        routeId: i,
        allowedPlantNames: allowedPlants
    });
}

// IMPORTANT : On attache les tableaux a l'objet window pour qu'ils soient globaux
window.PLANT_DB = PLANT_DB;
window.ROUTE_CONFIG = ROUTE_CONFIG;

/**
 * Chemin de l'image correspondant a une plante (ex: "./images/plantes/Algue Mutante.png")
 * @param {string} plantName - le nom exact de la plante (doit correspondre au nom du fichier image)
 */
window.getPlantImagePath = function(plantName) {
    return `./images/plantes/${plantName}.png`;
};

/**
 * Retourne une balise <img> (chaine HTML) pour afficher l'image d'une plante a la place
 * de son emoji. Si l'image est introuvable, elle se masque simplement (onerror) plutot
 * que d'afficher une icone cassee.
 * @param {string} plantName
 * @param {string} extraClass - classe(s) CSS supplementaire(s) a appliquer
 */
window.creerImgPlanteHTML = function(plantName, extraClass) {
    const cls = extraClass ? `plant-img ${extraClass}` : 'plant-img';
    return `<img src="${window.getPlantImagePath(plantName)}" class="${cls}" alt="${plantName}" onerror="this.style.display='none'">`;
};
