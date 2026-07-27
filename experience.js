/* experience.js - Systeme d'experience et de niveau du joueur */
/* Chaque plante detruite (clic OU symbiote) rapporte de l'XP selon sa rarete (voir donnees.js -> xpValue) */
/* NOUVEAU : le niveau du joueur est plafonne par gameState.niveauMaxDebloque. L'XP continue de */
/* s'accumuler au-dela du plafond (rien n'est perdu), mais aucune montee de niveau supplementaire */
/* n'a lieu tant que le plafond n'est pas releve (typiquement en vainquant le Boss - voir Boss.js). */

/**
 * Calcule l'XP necessaire pour passer du niveau donne au niveau suivant.
 * @param {number} niveau
 * @returns {number}
 */
window.xpRequisPourNiveau = function(niveau) {
    return Math.floor(100 * Math.pow(1.15, niveau - 1));
};

/**
 * Traite les montees de niveau en attente (XP deja accumulee) en respectant le plafond
 * actuel. Appelee a chaque gain d'XP, et aussi juste apres avoir releve le plafond
 * (ex: victoire contre le Boss) pour debloquer immediatement les niveaux en attente.
 */
window.verifierMonteeNiveau = function() {
    if (!window.gameState) return;
    if (typeof window.gameState.niveau !== 'number') window.gameState.niveau = 1;
    if (typeof window.gameState.xp !== 'number') window.gameState.xp = 0;
    if (typeof window.gameState.niveauMaxDebloque !== 'number') window.gameState.niveauMaxDebloque = 10;

    let xpRequis = window.xpRequisPourNiveau(window.gameState.niveau);
    while (window.gameState.niveau < window.gameState.niveauMaxDebloque && window.gameState.xp >= xpRequis) {
        window.gameState.xp -= xpRequis;
        window.gameState.niveau++;
        xpRequis = window.xpRequisPourNiveau(window.gameState.niveau);
    }

    window.updateXpBarUI();
};

/**
 * Ajoute de l'experience au joueur. Gere les montees de niveau (y compris plusieurs
 * d'un coup si le gain est important), met a jour la barre d'XP et sauvegarde.
 * @param {number} montant
 */
window.ajouterExperience = function(montant) {
    if (!window.gameState || !montant || montant <= 0) return;

    let montantFinal = montant;
    const bonusXp = window.evolutionManager
        ? window.evolutionManager.getBonusCombine('xpGainBonus', 'xp_bonus')
        : (window.mutationManager && window.mutationManager.getBonusValue ? window.mutationManager.getBonusValue('xpGainBonus') : 0);
    montantFinal = montant * (1 + bonusXp);

    // Bonus temporaire des Capsules (Nectar de Croissance)
    const capsuleXpMult = window.capsulesManager ? window.capsulesManager.getMultiplier('xp_mult') : 1;
    montantFinal *= capsuleXpMult;

    if (typeof window.gameState.xp !== 'number') window.gameState.xp = 0;
    if (typeof window.gameState.niveau !== 'number') window.gameState.niveau = 1;

    window.gameState.xp += montantFinal;

    window.verifierMonteeNiveau();

    if (window.sauvegarderProgression) {
        window.sauvegarderProgression();
    }
};

/**
 * Met a jour l'affichage de la barre d'XP et du niveau dans l'en-tete.
 * Affiche un etat "verrouille" distinct quand le plafond de niveau est atteint.
 */
window.updateXpBarUI = function() {
    if (!window.gameState) return;

    const niveau = window.gameState.niveau || 1;
    const xp = window.gameState.xp || 0;
    const niveauMax = window.gameState.niveauMaxDebloque || 10;
    const estBloque = niveau >= niveauMax;
    const xpRequis = window.xpRequisPourNiveau(niveau);
    const pourcentage = estBloque ? 100 : Math.max(0, Math.min(100, (xp / xpRequis) * 100));

    const niveauLabel = document.getElementById('niveau-label');
    const xpFill = document.getElementById('xp-bar-fill');
    const xpLabel = document.getElementById('xp-label');

    if (niveauLabel) niveauLabel.textContent = estBloque ? `Niveau ${niveau} 🔒` : `Niveau ${niveau}`;

    if (xpFill) {
        xpFill.style.width = `${pourcentage}%`;
        xpFill.classList.toggle('xp-bar-bloque', estBloque);
    }

    if (xpLabel) {
        xpLabel.textContent = estBloque
            ? `Niveau max (${niveauMax}) — vaincre le Boss pour débloquer plus`
            : `${Math.floor(xp)} / ${xpRequis} XP`;
    }
};
