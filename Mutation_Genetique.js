/* Mutation_Génétique.js - Système de Prestige (Reset + Monnaie + Artefacts permanents) */

window.mutationManager = {

    // Niveau minimum requis pour pouvoir déclencher une mutation
    MIN_LEVEL: 10,

    // Définition des améliorations permanentes achetables avec les Brins Mutants
    types: {
        damageMult: {
            name: "Dégâts du Sécateur",
            icon: "⚔️",
            baseCost: 5,
            growth: 1.5,
            statStep: 0.05, // +5% par niveau (multiplicatif, compose)
            desc: "+5% de dégâts permanents par niveau"
        },
        attackSpeedBonus: {
            name: "Vitesse d'Attaque",
            icon: "⚡",
            baseCost: 5,
            growth: 1.5,
            statStep: 15, // -15ms par niveau
            desc: "-15ms de délai d'attaque permanent par niveau"
        },
        upgradeCostReduction: {
            name: "Rabais Upgrades Dégâts",
            icon: "💸",
            baseCost: 8,
            growth: 1.6,
            statStep: 0.05,
            maxLevel: 10, // cap à -50% pour éviter un coût négatif
            desc: "-5% sur le coût des upgrades de Dégâts par niveau"
        },
        xpGainBonus: {
            name: "Gain d'XP",
            icon: "📈",
            baseCost: 6,
            growth: 1.5,
            statStep: 0.05,
            desc: "+5% d'XP gagnée par niveau"
        },
        freeExtractChance: {
            name: "Extraction Gratuite",
            icon: "🎲",
            baseCost: 10,
            growth: 1.7,
            statStep: 0.02,
            maxLevel: 25, // cap à 50%
            desc: "+2% de chance de garder la plante après extraction"
        },
        tripleSapChance: {
            name: "Sève Triplée",
            icon: "🧪",
            baseCost: 10,
            growth: 1.7,
            statStep: 0.02,
            maxLevel: 25, // cap à 50%
            desc: "+2% de chance d'obtenir x3 sève à l'extraction"
        },
        aoeSizeBonus: {
            name: "Zone du Sécateur",
            icon: "⭕",
            baseCost: 7,
            growth: 1.5,
            statStep: 5, // +5px par niveau
            desc: "+5px de rayon d'impact permanent"
        },
        goldSaleMultiplier: {
            name: "Valeur de Vente",
            icon: "💰",
            baseCost: 6,
            growth: 1.5,
            statStep: 0.05,
            desc: "+5% de golds gagnés à la vente par niveau"
        }
    },

    /**
     * S'assure que gameState contient bien les structures nécessaires
     * (utile après ajout de nouveaux types d'artefacts sur une sauvegarde existante)
     */
    ensureDefaults: function() {
        if (!window.gameState) return;
        if (!window.gameState.mutationUpgrades) window.gameState.mutationUpgrades = {};
        if (typeof window.gameState.brinsMutants !== 'number') window.gameState.brinsMutants = 0;
        if (typeof window.gameState.totalMutations !== 'number') window.gameState.totalMutations = 0;

        Object.keys(this.types).forEach(typeId => {
            if (typeof window.gameState.mutationUpgrades[typeId] !== 'number') {
                window.gameState.mutationUpgrades[typeId] = 0;
            }
        });
    },

    /**
     * Multiplicateur global des Brins Mutants gagnés (réservé pour un futur artefact dédié)
     */
    getBrinsMutantsMultiplier: function() {
        return 1;
    },

    /**
     * Formule : Brins mutants = 12 x 1.084^(niveau-10) x multiplicateur
     */
    calculerBrinsMutants: function(niveau) {
        const multiplier = this.getBrinsMutantsMultiplier();
        return Math.max(0, Math.floor(12 * Math.pow(1.084, niveau - 10) * multiplier));
    },

    /**
     * Meme calcul que calculerBrinsMutants, mais en incluant EN PLUS le
     * multiplicateur de la Boutique (perk "2X Brins Mutants"), pour affichage uniquement.
     * Le gain reel applique lors d'une mutation passe par boutiqueManager.ajouterBrins()
     * qui applique deja ce multiplicateur - cette fonction sert seulement a ce que
     * l'apercu affiche au joueur corresponde au montant qu'il va vraiment recevoir.
     */
    calculerBrinsMutantsAffiches: function(niveau) {
        const base = this.calculerBrinsMutants(niveau);
        const boutiqueMultiplier = (window.boutiqueManager && window.boutiqueManager.getBrinsMultiplier)
            ? window.boutiqueManager.getBrinsMultiplier()
            : 1;
        return Math.floor(base * boutiqueMultiplier);
    },

    peutMuter: function() {
        return window.gameState && (window.gameState.niveau || 1) >= this.MIN_LEVEL;
    },

    /**
     * Coût pour passer au niveau suivant d'un artefact (null si niveau max atteint)
     */
    getCost: function(typeId) {
        this.ensureDefaults();
        const upgrade = this.types[typeId];
        if (!upgrade) return null;
        const level = window.gameState.mutationUpgrades[typeId] || 0;
        if (upgrade.maxLevel && level >= upgrade.maxLevel) return null;
        return Math.floor(upgrade.baseCost * Math.pow(upgrade.growth, level));
    },

    /**
     * Valeur actuelle du bonus d'un artefact "passif" (lu dynamiquement par d'autres modules :
     * Extraction.js, Vente.js, experience.js, upgrades.js)
     */
    getBonusValue: function(typeId) {
        this.ensureDefaults();
        const upgrade = this.types[typeId];
        if (!upgrade) return 0;
        const level = window.gameState.mutationUpgrades[typeId] || 0;
        return level * upgrade.statStep;
    },

    /**
     * Applique l'effet d'UN SEUL niveau d'un artefact directement sur le sécateur
     * (pour damageMult / attackSpeedBonus / aoeSizeBonus). Les autres artefacts sont
     * de simples "taux" lus via getBonusValue() par les modules concernés.
     */
    appliquerBonusUnique: function(typeId) {
        const upgrade = this.types[typeId];
        if (!upgrade || !window.sécateur) return;

        switch (typeId) {
            case 'damageMult':
                window.sécateur.damage = window.sécateur.damage * (1 + upgrade.statStep);
                break;
            case 'attackSpeedBonus':
                window.sécateur.attackSpeed = Math.max(50, window.sécateur.attackSpeed - upgrade.statStep);
                break;
            case 'aoeSizeBonus':
                window.sécateur.radius += upgrade.statStep;
                break;
            default:
                break; // upgradeCostReduction, xpGainBonus, freeExtractChance, tripleSapChance, goldSaleMultiplier
        }
    },

    /**
     * Réapplique TOUS les niveaux d'artefacts sur le sécateur à partir de zéro.
     * À appeler : au chargement de la partie (après chargerProgression) ET juste après
     * une Mutation (une fois le sécateur remis à sa base).
     */
    reappliquerBonusPermanents: function() {
        this.ensureDefaults();
        const niveaux = window.gameState.mutationUpgrades;

        Object.keys(this.types).forEach(typeId => {
            const level = niveaux[typeId] || 0;
            for (let i = 0; i < level; i++) {
                this.appliquerBonusUnique(typeId);
            }
        });
    },

    /**
     * Résultat d'une extraction en tenant compte des chances d'extraction gratuite / sève x3.
     * Utilisé par Extraction.js.
     */
    rollExtractionResult: function(countToExtract, sapPerPlant) {
        const evoFreeBonus = window.evolutionManager ? window.evolutionManager.getBonus('free_extract') : 0;
        const freeChance = this.getBonusValue('freeExtractChance') + evoFreeBonus;
        const tripleChance = this.getBonusValue('tripleSapChance');

        let sapGained = 0;
        let plantsConsumed = 0;

        for (let i = 0; i < countToExtract; i++) {
            const isFree = Math.random() < freeChance;
            const isTriple = Math.random() < tripleChance;
            sapGained += isTriple ? sapPerPlant * 3 : sapPerPlant;
            if (!isFree) plantsConsumed++;
        }

        return { sapGained: Math.floor(sapGained), plantsConsumed };
    },

    /**
     * Achète un niveau d'un artefact permanent
     */
    acheterAmelioration: function(typeId) {
        this.ensureDefaults();
        const upgrade = this.types[typeId];
        if (!upgrade) return;

        const level = window.gameState.mutationUpgrades[typeId] || 0;
        if (upgrade.maxLevel && level >= upgrade.maxLevel) return;

        const cost = this.getCost(typeId);
        if (cost === null) return;

        const solde = window.gameState.brinsMutants || 0;
        if (solde < cost) return;

        window.gameState.brinsMutants = solde - cost;
        window.gameState.mutationUpgrades[typeId] = level + 1;

        this.appliquerBonusUnique(typeId);

        if (window.sauvegarderProgression) window.sauvegarderProgression();
        this.initMutationMenu();
        if (window.updateHeaderUI) window.updateHeaderUI();
    },

    /**
     * Declenche l'affichage du popup de confirmation de Mutation Genetique.
     * La logique reelle de mutation est dans executerMutation(), appelee seulement
     * si le joueur confirme via l'overlay.
     */
    effectuerMutation: function() {
        if (!window.gameState) return false;

        if (!this.peutMuter()) {
            alert(`Vous devez atteindre le niveau ${this.MIN_LEVEL} pour déclencher une Mutation Génétique.`);
            return false;
        }

        this.creerOverlayConfirmationMutation();
    },

    /**
     * Overlay de confirmation "maison" (au lieu de confirm() natif, qui peut etre
     * bloque silencieusement dans certains environnements/iframes/WebView) pour la
     * Mutation Genetique.
     */
    creerOverlayConfirmationMutation: function() {
        if (document.getElementById('mutation-confirm-overlay')) return;

        const niveau = window.gameState.niveau || 1;
        const gainAffiche = this.calculerBrinsMutantsAffiches(niveau);

        const overlay = document.createElement('div');
        overlay.id = 'mutation-confirm-overlay';
        overlay.className = 'menu-overlay';
        overlay.style.zIndex = '2000';

        overlay.innerHTML = `
            <div class="menu-content" style="max-width: 420px; padding: 25px; text-align: center; border-color: #b967ff; box-shadow: 0 0 30px #b967ff;">
                <h2 style="color: #d9a3ff; text-shadow: 0 0 8px #b967ff; margin-bottom: 15px;">🧬 Mutation Génétique 🧬</h2>
                <p style="font-size: 0.85rem; color: #e0d0f0; line-height: 1.6; margin-bottom: 15px;">
                    Vous êtes actuellement <strong>niveau ${niveau}</strong>.
                </p>
                <p style="font-size: 0.8rem; color: #ffcccc; line-height: 1.6; margin-bottom: 15px;">
                    Vous allez <strong>PERDRE</strong> :<br>
                    Niveau &amp; XP, Golds, Plantes &amp; Sèves,<br>
                    Améliorations de Stats (Upgrades), Progression de route.
                </p>
                <p style="font-size: 0.85rem; color: #d9a3ff; line-height: 1.6; margin-bottom: 20px;">
                    Vous allez <strong>GAGNER</strong> :<br>
                    <span style="font-size: 1.3rem; font-weight: bold; text-shadow: 0 0 8px #b967ff;">+ ${gainAffiche.toLocaleString()} Brins Mutants 🧬</span><br>
                    <span style="font-size: 0.7rem; opacity: 0.7;">(permanents)</span>
                </p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="btn-annuler-mutation" class="admin-btn">Annuler</button>
                    <button id="btn-confirmer-mutation" class="btn-mutation-trigger" style="width: auto; padding: 10px 20px;">🧬 Confirmer</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('btn-annuler-mutation').onclick = () => overlay.remove();

        document.getElementById('btn-confirmer-mutation').onclick = () => {
            overlay.remove();
            window.mutationManager.executerMutation();
        };

        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };
    },

    /**
     * Execute reellement la Mutation Genetique (gain de monnaie + reset de la run courante).
     * Appelee uniquement apres confirmation via l'overlay de confirmation.
     */
    executerMutation: function() {
        if (!window.gameState) return false;

        const gain = this.calculerBrinsMutants(window.gameState.niveau);

        // 1. Gain de la monnaie de prestige (jamais reset)
        // On passe par boutiqueManager.ajouterBrins() pour que le perk "2X Brins Mutants" s'applique correctement
        const gainReel = (window.boutiqueManager && window.boutiqueManager.ajouterBrins)
            ? window.boutiqueManager.ajouterBrins(gain)
            : (window.gameState.brinsMutants = (window.gameState.brinsMutants || 0) + gain, gain);
        window.gameState.totalMutations = (window.gameState.totalMutations || 0) + 1;

        // 2. Reset de la progression courante
        window.gameState.niveau = 1;
        window.gameState.xp = 0;
        window.gameState.niveauMaxDebloque = 10; // Le plafond se reinitialise aussi : il faut re-vaincre le Boss chaque run
        window.gameState.boss = { niveau: 1, derniereTentative: 0 }; // Le Boss redevient accessible des le debut du run
        window.gameState.golds = 0;
        window.gameState.inventairePlantes = {};
        window.gameState.inventaireSeves = {};
        window.gameState.inventory = window.gameState.inventaireSeves;
        window.gameState.upgrades = {};
        window.gameState.currentRoute = 1;
        window.gameState.wavesCompleted = 0;
        window.gameState.wavesCompletedParRoute = {};
        window.gameState.unlockedRoute = 1;
        window.gameState.activePlants = [];

        // 3. Reset du Sécateur/Symbiotes à leur base, puis ré-application des SEULS bonus permanents
        if (window.SECATEUR_BASE_STATS && window.sécateur) {
            window.sécateur.damage = window.SECATEUR_BASE_STATS.damage;
            window.sécateur.attackSpeed = window.SECATEUR_BASE_STATS.attackSpeed;
            window.sécateur.radius = window.SECATEUR_BASE_STATS.radius;
            window.sécateur.critChance = window.SECATEUR_BASE_STATS.critChance;
            window.sécateur.critDamage = window.SECATEUR_BASE_STATS.critDamage;
        }
        if (window.symbiotesManager) {
            window.symbiotesManager.aoeBonus = 0;
            window.symbiotesManager.speedBonus = 0;
        }
        if (window.upgradesManager && window.upgradesManager.ensureDefaults) {
            window.upgradesManager.ensureDefaults();
        }
        this.reappliquerBonusPermanents();
        if (window.evolutionManager && window.evolutionManager.reappliquerEffetsDirects) {
            window.evolutionManager.reappliquerEffetsDirects();
        }

        // 4. Rafraîchissement de l'UI
        if (window.updateRouteUI) window.updateRouteUI();
        if (window.updateHeaderUI) window.updateHeaderUI();
        if (window.updateXpBarUI) window.updateXpBarUI();
        if (window.updateInventoryUI) window.updateInventoryUI();
        if (window.spawnWave) window.spawnWave();

        // 5. Sauvegarde
        if (window.sauvegarderProgression) window.sauvegarderProgression();

        // 6. Rafraîchissement du menu
        this.initMutationMenu();

        this.creerOverlaySucces(gainReel);
        return true;
    },

    /**
     * Petit overlay de succes affiche apres une mutation reussie (remplace l'alert() natif).
     */
    creerOverlaySucces: function(gainReel) {
        if (document.getElementById('mutation-succes-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'mutation-succes-overlay';
        overlay.className = 'menu-overlay';
        overlay.style.zIndex = '2000';

        overlay.innerHTML = `
            <div class="menu-content" style="max-width: 380px; padding: 25px; text-align: center; border-color: #b967ff; box-shadow: 0 0 30px #b967ff;">
                <h2 style="color: #d9a3ff; text-shadow: 0 0 8px #b967ff; margin-bottom: 15px;">✅ Mutation Réussie !</h2>
                <p style="font-size: 1rem; color: #fff; margin-bottom: 20px;">
                    Vous avez gagné<br>
                    <span style="font-size: 1.5rem; font-weight: bold; color: #d9a3ff; text-shadow: 0 0 8px #b967ff;">+ ${gainReel.toLocaleString()} 🧬</span>
                </p>
                <button id="btn-fermer-succes-mutation" class="btn-mutation-trigger" style="width: auto; padding: 10px 25px;">OK</button>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById('btn-fermer-succes-mutation').onclick = () => overlay.remove();
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };
    },

    /**
     * Construit l'interface du sous-menu Mutation Génétique
     */
    initMutationMenu: function() {
        const container = document.getElementById('mutation-container');
        if (!container) return;
        this.ensureDefaults();

        container.innerHTML = '';

        const niveau = window.gameState.niveau || 1;
        const solde = window.gameState.brinsMutants || 0;
        const gainPreview = this.calculerBrinsMutantsAffiches(niveau);
        const peutMuter = this.peutMuter();

        const header = document.createElement('div');
        header.className = 'mutation-header-info';
        header.innerHTML = `
            <div class="mutation-solde">
                <span class="label">🧬 Brins Mutants :</span>
                <span class="value">${solde.toLocaleString()}</span>
            </div>
            <div class="mutation-preview">
                ${peutMuter
                    ? `Muter maintenant (Niveau ${niveau}) rapportera <strong>+${gainPreview.toLocaleString()}</strong> 🧬`
                    : `Atteignez le niveau ${this.MIN_LEVEL} pour débloquer la Mutation Génétique (actuellement niveau ${niveau})`}
            </div>
            <button class="btn-mutation-trigger" ${peutMuter ? '' : 'disabled'} onclick="window.mutationManager.effectuerMutation()">
                🧬 Déclencher la Mutation Génétique
            </button>
        `;
        container.appendChild(header);

        const grid = document.createElement('div');
        grid.className = 'mutation-grid';
        Object.keys(this.types).forEach(typeId => {
            this.createMutationCard(typeId, grid);
        });
        container.appendChild(grid);
    },

    createMutationCard: function(typeId, container) {
        const upgrade = this.types[typeId];
        const level = window.gameState.mutationUpgrades[typeId] || 0;
        const isMax = upgrade.maxLevel && level >= upgrade.maxLevel;
        const cost = this.getCost(typeId);
        const solde = window.gameState.brinsMutants || 0;
        const canAfford = !isMax && cost !== null && solde >= cost;

        const card = document.createElement('div');
        card.className = `mutation-card ${canAfford ? '' : 'cannot-afford'}`;

        card.innerHTML = `
            <div class="mutation-card-top">
                <span class="mutation-icon">${upgrade.icon}</span>
                <div class="mutation-info">
                    <span class="mutation-name">${upgrade.name}</span>
                    <span class="mutation-level">Niveau ${level}${upgrade.maxLevel ? ' / ' + upgrade.maxLevel : ''}</span>
                </div>
            </div>
            <div class="mutation-desc">${upgrade.desc}</div>
            <div class="mutation-cost">
                ${isMax ? 'NIVEAU MAXIMUM' : `Coût : <span class="cost-value">${cost.toLocaleString()} 🧬</span>`}
            </div>
            <button class="btn-mutation" ${canAfford ? '' : 'disabled'}
                    onclick="window.mutationManager.acheterAmelioration('${typeId}')">
                ${isMax ? 'MAX' : (canAfford ? 'AMÉLIORER' : 'INSUFFISANT')}
            </button>
        `;

        container.appendChild(card);
    }
};

// Styles CSS dédiés (thème violet/magenta pour distinguer le Prestige)
if (!document.getElementById('mutation-styles')) {
    const style = document.createElement('style');
    style.id = 'mutation-styles';
    style.textContent = `
        .mutation-header-info {
            background: #1a0f1a;
            padding: 15px;
            border-radius: 5px;
            border: 1px solid #b967ff;
            margin-bottom: 20px;
            text-align: center;
        }
        .mutation-solde .label { color: #cba3e6; font-size: 0.9rem; }
        .mutation-solde .value {
            display: block;
            color: #d9a3ff;
            font-size: 1.8rem;
            font-weight: bold;
            text-shadow: 0 0 10px rgba(185, 103, 255, 0.6);
        }
        .mutation-preview {
            font-size: 0.85rem;
            color: #e0d0f0;
            margin: 10px 0;
        }
        .btn-mutation-trigger {
            background: linear-gradient(180deg, #b967ff, #6a2e99);
            border: 1px solid #d9a3ff;
            border-bottom: 3px solid #4a1d70;
            color: #fff;
            font-weight: bold;
            font-size: 0.85rem;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            width: 100%;
            transition: 0.15s;
        }
        .btn-mutation-trigger:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
        .btn-mutation-trigger:disabled { background: #333; border-color: #444; color: #777; cursor: not-allowed; }

        .mutation-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .mutation-card {
            background: #1f1424;
            border: 1px solid #6a2e99;
            padding: 12px;
            border-radius: 4px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            transition: 0.2s;
        }
        .mutation-card:hover:not(.cannot-afford) { border-color: #d9a3ff; transform: translateY(-2px); }
        .mutation-card.cannot-afford { opacity: 0.7; filter: grayscale(0.4); }

        .mutation-card-top { display: flex; align-items: center; gap: 10px; }
        .mutation-icon { font-size: 1.5rem; }
        .mutation-info { display: flex; flex-direction: column; }
        .mutation-name { font-weight: bold; color: #fff; font-size: 0.85rem; }
        .mutation-level { font-size: 0.7rem; color: #cba3e6; }
        .mutation-desc { font-size: 0.7rem; color: #b8a0c8; min-height: 28px; }

        .mutation-cost { font-size: 0.8rem; color: #e0d0f0; text-align: center; background: rgba(0,0,0,0.25); padding: 5px; border-radius: 3px; }
        .cost-value { color: #d9a3ff; font-weight: bold; }

        .btn-mutation {
            background: #4a1d70;
            color: #fff;
            border: none;
            padding: 8px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 0.75rem;
            cursor: pointer;
            border-bottom: 3px solid #2e0f4a;
        }
        .btn-mutation:hover:not(:disabled) { background: #6a2e99; }
        .btn-mutation:disabled { background: #333; border-bottom-color: #222; color: #666; cursor: not-allowed; }
    `;
    document.head.appendChild(style);
}