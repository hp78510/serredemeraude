/* securateur.js - Gestion du Secateur et des degats */

// Initialisation de l'objet Secateur global
window.sécateur = {
    damage: 2,          // Degats de base
    attackSpeed: 500,   // ms entre les attaques si clic maintenu (non implemente ici, mais pret pour le futur)
    radius: 50,         // Rayon d'impact en pixels (AOE)
    critChance: 0.10,   // 10% de chance de crit
    critDamage: 1.5     // Multiplicateur de degats critique
};

// Compatibilite avec le code existant
window.secateur = window.sécateur;

// Snapshot des stats de base, utilise par mutationManager pour reinitialiser
// le secateur lors d'une Mutation Genetique (sans perdre les bonus permanents)
window.SECATEUR_BASE_STATS = { ...window.sécateur };

/**
 * Calcule les degats reels infliges par le secateur
 * @returns {number} Les degats finaux (incluant le crit potentiel)
 */
window.calculerDegatsSecateur = function() {
    const bonusCrit = window.capsulesManager ? window.capsulesManager.getBonusAdditif('crit_chance_add') : 0;
    const isCrit = Math.random() < (window.secateur.critChance + bonusCrit);
    const multiplier = isCrit ? window.secateur.critDamage : 1;

    const bonusDamageMult = window.capsulesManager ? window.capsulesManager.getMultiplier('secateur_damage_mult') : 1;

    // On arrondit pour avoir des nombres entiers
    return Math.floor(window.secateur.damage * multiplier * bonusDamageMult);
};

/**
 * Applique des degats a une plante specifique
 * @param {Object} plantData - L'objet plante contenant l'element DOM et les stats
 * @param {number} damage - Les degats a appliquer
 */
window.appliquerDegats = function(plantData, damage) {
    plantData.pv -= damage;

    // Alimente la jauge des Capsules Organiques Scellees
    if (window.capsulesManager) {
        window.capsulesManager.ajouterDegatsJauge(damage);
    }

    // Mise a jour visuelle de la barre de vie
    updateHealthBar(plantData);

    // Verification de la mort
    if (plantData.pv <= 0) {
        // La plante est recoltee
        window.recolterPlante(plantData);
    }
};

/**
 * Met a jour la barre de vie HTML au-dessus de la plante
 */
function updateHealthBar(plantData) {
    const healthBar = plantData.element.querySelector('.health-bar-fill');
    if (healthBar) {
        const maxHp = plantData.template.maxHp;
        const currentHp = Math.max(0, plantData.pv);
        const percentage = (currentHp / maxHp) * 100;
        
        healthBar.style.width = `${percentage}%`;
        
        // Changement de couleur si PV bas
        if (percentage < 30) {
            healthBar.style.backgroundColor = '#ff3939'; // Rouge
        } else if (percentage < 60) {
            healthBar.style.backgroundColor = '#ffff39'; // Jaune
        } else {
            healthBar.style.backgroundColor = '#39ff14'; // Vert
        }
    }
}

/**
 * Recolte la plante (ajout a l'inventaire et suppression du DOM)
 * Note: Cette fonction appelle les fonctions globales definies dans app.js
 */
window.recolterPlante = function(plantData) {
    // Ajout a l'inventaire de plantes
    if (window.addToInventoryPlant) {
        window.addToInventoryPlant(plantData.template.name);
    }

    // Gain d'XP en fonction de la rarete de la plante detruite
    if (window.ajouterExperience && plantData.template && plantData.template.xpValue) {
        window.ajouterExperience(plantData.template.xpValue);
    }

    // Amelioration de Symbiotes "Recolte Doree" : golds bonus immediats (10% du prix
    // de vente REEL de la plante, memes bonus qu'une vente normale), en plus de la
    // plante ajoutee normalement a l'inventaire
    if (window.symbiotesManager && window.symbiotesManager.calculerGoldBonusRecolte && plantData.template) {
        const bonusGold = window.symbiotesManager.calculerGoldBonusRecolte(plantData.template);
        if (bonusGold > 0 && window.economie) {
            window.economie.ajouterGolds(bonusGold);
        }
    }

    // Suppression visuelle et logique
    if (plantData.element && plantData.element.parentNode) {
        plantData.element.parentNode.removeChild(plantData.element);
    }

    // Mise a jour de l'etat global des plantes actives
    if (window.gameState && window.gameState.activePlants) {
        window.gameState.activePlants = window.gameState.activePlants.filter(p => p.id !== plantData.id);
        
        // Verification si la vague est terminee
        if (window.gameState.activePlants.length === 0) {
            window.onWaveCompleted();
        }
    }
};