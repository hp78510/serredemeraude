/* boutique.js - Systeme de boutique (Ressources, Perks, Bonus Permanent, Packs de Gemmes, Gemmes Upgrades) */

window.boutiqueManager = {

    // --- CONFIGURATION CENTRALISEE (facile a reequilibrer) ---
    config: {
        freePack: {
            montantGemmes: 5,
            intervalMs: 10 * 60 * 1000, // 10 minutes
            maxStockBase: 3
        },
        petitPack: { coutGemmes: 100, brins: 50 },
        grosPack: { coutGemmes: 300, brins: 250 },
        eclatEmeraude: { coutGemmes: 100 }, // NOUVEAU
        perks: {
            doublePlants: { name: "2X plus de plantes recoltees", icon: "🌿", cout: 500 },
            doubleBrins:  { name: "2X plus de Brins Mutants", icon: "🧬", cout: 500 },
            doubleSap:    { name: "2X plus de seve extraite", icon: "🧪", cout: 500 }
        },
        symbioteSlot: {
            name: "Emplacement de Symbiote Supplementaire",
            icon: "🍄",
            cout: 2500 // Placeholder : ajuste librement cette valeur
        },
        gemmePacksReels: [
            { gemmes: 100, prixEuro: 1 },
            { gemmes: 500, prixEuro: 3 }
        ],
        gemmeUpgrades: {
            secateurDamage: {
                name: "Degats du Secateur",
                icon: "⚔️",
                cout: 150,     // Cout fixe par achat
                max: 15,       // Nombre d'achats maximum
                step: 0.20     // Bonus de degats par achat
            },
            freePackStorage: {
                name: "Capacite du Pack Gratuit",
                icon: "📦",
                coutBase: 200,
                croissance: 1.5,
                maxAchats: 10, // Cap raisonnable, ajustable
                bonusParNiveau: 1
            }
        }
    },

    // --- ETAT / SAUVEGARDE ---

    /**
     * S'assure que window.gameState.boutique et window.gameState.brinsMutants existent
     * avec des valeurs par defaut coherentes. A appeler avant toute lecture/ecriture.
     */
    ensureDefaults: function() {
        if (!window.gameState) return;

        if (typeof window.gameState.brinsMutants !== 'number') {
            window.gameState.brinsMutants = 0;
        }
        if (typeof window.gameState.eclatsEmeraude !== 'number') { // NOUVEAU
            window.gameState.eclatsEmeraude = 0;
        }

        if (!window.gameState.boutique) {
            window.gameState.boutique = {};
        }
        const b = window.gameState.boutique;

        if (typeof b.freePackStock !== 'number') b.freePackStock = this.config.freePack.maxStockBase;
        if (typeof b.freePackLastGenTime !== 'number') b.freePackLastGenTime = Date.now();
        if (typeof b.freePackStorageLevel !== 'number') b.freePackStorageLevel = 0;
        if (typeof b.secateurDamageLevel !== 'number') b.secateurDamageLevel = 0;
        if (typeof b.symbioteSlotAchete !== 'boolean') b.symbioteSlotAchete = false;

        if (!b.perks) b.perks = {};
        Object.keys(this.config.perks).forEach(key => {
            if (typeof b.perks[key] !== 'boolean') b.perks[key] = false;
        });
    },

    /**
     * Reapplique les effets persistants au chargement de la page (le secateur et
     * symbiotesManager repartent de zero a chaque rechargement, comme pour upgrades.js).
     * A appeler dans app.js -> initGame(), apres chargerProgression().
     */
    reappliquer: function() {
        this.ensureDefaults();
        const b = window.gameState.boutique;

        if (window.secateur) {
            window.secateur.damage += b.secateurDamageLevel * this.config.gemmeUpgrades.secateurDamage.step;
        }

        if (window.symbiotesManager) {
            window.symbiotesManager.maxActifs = 2 + (b.symbioteSlotAchete ? 1 : 0);
        }

        this.recalculerFreePackStock();
    },

    // --- MULTIPLICATEURS (utilises par les autres modules) ---

    getPlantMultiplier: function() {
        this.ensureDefaults();
        return window.gameState.boutique.perks.doublePlants ? 2 : 1;
    },

    getSapMultiplier: function() {
        this.ensureDefaults();
        return window.gameState.boutique.perks.doubleSap ? 2 : 1;
    },

    getBrinsMultiplier: function() {
        this.ensureDefaults();
        return window.gameState.boutique.perks.doubleBrins ? 2 : 1;
    },

    /**
     * Ajoute des Brins Mutants (monnaie de prestige) en tenant compte du multiplicateur.
     * @param {number} montant - montant DE BASE (avant multiplicateur)
     * @param {boolean} appliquerMultiplicateur - si false, ajoute le montant tel quel
     */
    ajouterBrins: function(montant, appliquerMultiplicateur) {
        this.ensureDefaults();
        const final = appliquerMultiplicateur === false ? montant : montant * this.getBrinsMultiplier();
        window.gameState.brinsMutants += final;
        if (window.updateHeaderUI) window.updateHeaderUI();
        window.sauvegarderProgression();
        return final;
    },

    /**
     * Ajoute des Éclats d'Émeraude (monnaie de l'Arbre d'Évolution)
     */
    ajouterEclats: function(montant) {
        this.ensureDefaults();
        window.gameState.eclatsEmeraude = (window.gameState.eclatsEmeraude || 0) + montant;
        if (window.updateHeaderUI) window.updateHeaderUI();
        window.sauvegarderProgression();
        return montant;
    },

    // --- PACK GRATUIT ---

    getMaxFreePackStock: function() {
        this.ensureDefaults();
        return this.config.freePack.maxStockBase +
            (window.gameState.boutique.freePackStorageLevel * this.config.gemmeUpgrades.freePackStorage.bonusParNiveau);
    },

    /**
     * Recalcule le stock de packs gratuits en fonction du temps ecoule.
     * Doit etre appele regulierement (au chargement, a l'ouverture de la boutique, etc.)
     */
    recalculerFreePackStock: function() {
        this.ensureDefaults();
        const b = window.gameState.boutique;
        const max = this.getMaxFreePackStock();

        if (b.freePackStock >= max) {
            b.freePackStock = max;
            b.freePackLastGenTime = Date.now();
            return;
        }

        const elapsed = Date.now() - b.freePackLastGenTime;
        const intervalMs = this.config.freePack.intervalMs;
        const packsGeneres = Math.floor(elapsed / intervalMs);

        if (packsGeneres > 0) {
            b.freePackStock = Math.min(max, b.freePackStock + packsGeneres);
            b.freePackLastGenTime += packsGeneres * intervalMs;
            if (b.freePackStock >= max) {
                b.freePackLastGenTime = Date.now();
            }
        }
    },

    /**
     * Retourne le temps restant (ms) avant le prochain pack, ou null si le stock est plein.
     */
    getTempsAvantProchainPack: function() {
        this.ensureDefaults();
        const b = window.gameState.boutique;
        const max = this.getMaxFreePackStock();
        if (b.freePackStock >= max) return null;
        const intervalMs = this.config.freePack.intervalMs;
        const restant = intervalMs - (Date.now() - b.freePackLastGenTime);
        return Math.max(0, restant);
    },

    reclamerFreePack: function() {
        this.recalculerFreePackStock();
        const b = window.gameState.boutique;
        if (b.freePackStock <= 0) return false;

        const packsAReclamer = b.freePackStock;
        b.freePackStock = 0;

        const gemmesParPack = this.config.freePack.montantGemmes;
        let totalGemmes = 0;
        let totalEclats = 0;

        for (let i = 0; i < packsAReclamer; i++) {
            totalGemmes += gemmesParPack;
            // 10% de chance PAR PACK d'obtenir en plus 1 Éclat d'Émeraude
            if (Math.random() < 0.10) {
                totalEclats += 1;
            }
        }

        if (window.economie) {
            window.economie.ajouterGemmes(totalGemmes);
        }
        if (totalEclats > 0) {
            this.ajouterEclats(totalEclats);
        }

        this.animerGainFreePack(totalGemmes, totalEclats);

        window.sauvegarderProgression();
        this.refreshBoutiqueUI();
        return true;
    },

    /**
     * Petite animation flottante ("+5 💎" / "+1 💚") qui s'eleve depuis la carte
     * du Pack Gratuit puis s'estompe. Purement visuelle, aucun impact sur la logique.
     */
    animerGainFreePack: function(totalGemmes, totalEclats) {
        const card = document.getElementById('boutique-freepack-card');
        if (!card) return;

        this.injectFloatingGainStyles();

        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const topY = rect.top + 15;

        const creerFloat = function(texte, decalageX, delaiMs, classeExtra) {
            const el = document.createElement('div');
            el.className = `boutique-float-gain ${classeExtra || ''}`;
            el.textContent = texte;
            el.style.left = `${centerX + decalageX}px`;
            el.style.top = `${topY}px`;
            el.style.animationDelay = `${delaiMs}ms`;
            document.body.appendChild(el);

            setTimeout(() => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, delaiMs + 1300);
        };

        creerFloat(`+${totalGemmes} 💎`, -18, 0);

        if (totalEclats > 0) {
            // Petit delai pour que le "+💚" apparaisse juste apres, en decale
            creerFloat(`+${totalEclats} 💚`, 18, 180, 'boutique-float-gain-eclat');
        }
    },

    injectFloatingGainStyles: function() {
        if (document.getElementById('boutique-float-gain-styles')) return;
        const style = document.createElement('style');
        style.id = 'boutique-float-gain-styles';
        style.textContent = `
            @keyframes boutiqueFloatUp {
                0% { opacity: 0; transform: translate(-50%, 0) scale(0.8); }
                15% { opacity: 1; transform: translate(-50%, -12px) scale(1.05); }
                75% { opacity: 1; transform: translate(-50%, -45px) scale(1); }
                100% { opacity: 0; transform: translate(-50%, -62px) scale(0.95); }
            }
            .boutique-float-gain {
                position: fixed;
                z-index: 4000;
                font-family: 'Courier New', monospace;
                font-weight: bold;
                font-size: 0.9rem;
                color: var(--neon-green);
                text-shadow: 0 0 8px rgba(57, 255, 20, 0.8);
                pointer-events: none;
                opacity: 0;
                white-space: nowrap;
                animation: boutiqueFloatUp 1.1s ease-out forwards;
            }
            .boutique-float-gain-eclat {
                color: #d9a3ff;
                text-shadow: 0 0 8px rgba(185, 103, 255, 0.8);
            }
        `;
        document.head.appendChild(style);
    },

    acheterEclatEmeraude: function() {
        const cfg = this.config.eclatEmeraude;
        if (!window.economie || !window.economie.depenserGemmes(cfg.coutGemmes)) {
            alert("Gemmes insuffisantes.");
            return;
        }
        this.ajouterEclats(1);
        this.refreshBoutiqueUI();
    },

    // --- ACHATS : RESSOURCES ---

    acheterPetitPack: function() {
        const cfg = this.config.petitPack;
        if (!window.economie || !window.economie.depenserGemmes(cfg.coutGemmes)) {
            alert("Gemmes insuffisantes.");
            return;
        }
        this.ajouterBrins(cfg.brins);
        this.refreshBoutiqueUI();
    },

    acheterGrosPack: function() {
        const cfg = this.config.grosPack;
        if (!window.economie || !window.economie.depenserGemmes(cfg.coutGemmes)) {
            alert("Gemmes insuffisantes.");
            return;
        }
        this.ajouterBrins(cfg.brins);
        this.refreshBoutiqueUI();
    },

    // --- ACHATS : PERKS ---

    acheterPerk: function(type) {
        this.ensureDefaults();
        const cfg = this.config.perks[type];
        if (!cfg) return;
        const b = window.gameState.boutique;

        if (b.perks[type]) return; // deja achete

        if (!window.economie || !window.economie.depenserGemmes(cfg.cout)) {
            alert("Gemmes insuffisantes.");
            return;
        }

        b.perks[type] = true;
        window.sauvegarderProgression();
        this.refreshBoutiqueUI();
    },

    // --- ACHATS : BONUS PERMANENT ---

    acheterSymbioteSlot: function() {
        this.ensureDefaults();
        const b = window.gameState.boutique;
        const cfg = this.config.symbioteSlot;

        if (b.symbioteSlotAchete) return;

        if (!window.economie || !window.economie.depenserGemmes(cfg.cout)) {
            alert("Gemmes insuffisantes.");
            return;
        }

        b.symbioteSlotAchete = true;
        if (window.symbiotesManager) {
            window.symbiotesManager.maxActifs = (window.symbiotesManager.maxActifs || 2) + 1;
        }
        window.sauvegarderProgression();
        this.refreshBoutiqueUI();

        if (window.refreshSymbiotesMenu) window.refreshSymbiotesMenu();
    },

    // --- ACHATS : GEMMES UPGRADES ---

    acheterGemmeUpgradeSecateur: function() {
        this.ensureDefaults();
        const b = window.gameState.boutique;
        const cfg = this.config.gemmeUpgrades.secateurDamage;

        if (b.secateurDamageLevel >= cfg.max) return;

        if (!window.economie || !window.economie.depenserGemmes(cfg.cout)) {
            alert("Gemmes insuffisantes.");
            return;
        }

        b.secateurDamageLevel += 1;
        if (window.secateur) {
            window.secateur.damage += cfg.step;
        }
        window.sauvegarderProgression();
        this.refreshBoutiqueUI();
    },

    getCoutStorageActuel: function() {
        const b = window.gameState.boutique;
        const cfg = this.config.gemmeUpgrades.freePackStorage;
        return Math.floor(cfg.coutBase * Math.pow(cfg.croissance, b.freePackStorageLevel));
    },

    acheterGemmeUpgradeStorage: function() {
        this.ensureDefaults();
        const b = window.gameState.boutique;
        const cfg = this.config.gemmeUpgrades.freePackStorage;

        if (b.freePackStorageLevel >= cfg.maxAchats) return;

        const cout = this.getCoutStorageActuel();
        if (!window.economie || !window.economie.depenserGemmes(cout)) {
            alert("Gemmes insuffisantes.");
            return;
        }

        b.freePackStorageLevel += 1;
        window.sauvegarderProgression();
        this.recalculerFreePackStock();
        this.refreshBoutiqueUI();
    },

    // --- PACKS DE GEMMES (apercu uniquement, pas de vraie transaction) ---

    acheterPackGemmesReel: function(index) {
        const pack = this.config.gemmePacksReels[index];
        if (!pack) return;
        alert(`Achat de ${pack.gemmes} 💎 pour ${pack.prixEuro}€ : fonctionnalite de paiement a venir !`);
    },

    // --- INTERFACE ---

    _intervalId: null,
    _activeTab: 'ressources',

    ouvrirBoutique: function() {
        this.ensureDefaults();
        this.recalculerFreePackStock();

        if (document.getElementById('boutique-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'boutique-overlay';
        overlay.className = 'menu-overlay';
        overlay.onclick = (e) => {
            if (e.target === overlay) this.fermerBoutique();
        };

        overlay.innerHTML = `
            <div class="menu-content">
                <div class="menu-header">
                    <h2>🛒 Boutique</h2>
                    <button class="btn-close-menu" onclick="window.boutiqueManager.fermerBoutique()">✖</button>
                </div>

                <div class="menu-tabs boutique-tabs">
                    <button class="tab-btn active" data-tab="ressources">Ressources</button>
                    <button class="tab-btn" data-tab="perks">Perks</button>
                    <button class="tab-btn" data-tab="bonus">Bonus Perm.</button>
                    <button class="tab-btn" data-tab="gemmes">Packs 💎</button>
                    <button class="tab-btn" data-tab="upgrades">Gemmes Upg.</button>
                </div>

                <div class="menu-body">
                    <div id="boutique-tab-ressources" class="menu-section active-section"></div>
                    <div id="boutique-tab-perks" class="menu-section"></div>
                    <div id="boutique-tab-bonus" class="menu-section"></div>
                    <div id="boutique-tab-gemmes" class="menu-section"></div>
                    <div id="boutique-tab-upgrades" class="menu-section"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const tabBtns = overlay.querySelectorAll('.tab-btn');
        const sections = overlay.querySelectorAll('.menu-section');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                sections.forEach(sec => sec.classList.remove('active-section'));
                this._activeTab = btn.getAttribute('data-tab');
                document.getElementById('boutique-tab-' + this._activeTab).classList.add('active-section');
            });
        });

        this.injectStyles();
        this.refreshBoutiqueUI();

        this._intervalId = setInterval(() => {
            this.recalculerFreePackStock();
            this.refreshBoutiqueUI(true); // rafraichissement leger (juste le compte a rebours)
        }, 1000);
    },

    fermerBoutique: function() {
        const overlay = document.getElementById('boutique-overlay');
        if (overlay) overlay.remove();
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    },

    formatTemps: function(ms) {
        const totalSec = Math.ceil(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    },

    /**
     * Reconstruit le contenu de tous les onglets. Si 'leger' est vrai, on ne redessine
     * que la zone du pack gratuit (pour eviter de reconstruire toute la boutique chaque seconde).
     */
    refreshBoutiqueUI: function(leger) {
        if (!document.getElementById('boutique-overlay')) return;

        if (leger) {
            this.renderRessourcesTab();
            return;
        }

        this.renderRessourcesTab();
        this.renderPerksTab();
        this.renderBonusTab();
        this.renderGemmesTab();
        this.renderUpgradesTab();
    },

    renderRessourcesTab: function() {
        const container = document.getElementById('boutique-tab-ressources');
        if (!container) return;

        this.ensureDefaults();
        const b = window.gameState.boutique;
        const max = this.getMaxFreePackStock();
        const tempsRestant = this.getTempsAvantProchainPack();
        const cfgPetit = this.config.petitPack;
        const cfgGros = this.config.grosPack;
        const cfgEclat = this.config.eclatEmeraude; // NOUVEAU

        container.innerHTML = `
            <h3>Ressources</h3>
            <div class="boutique-card" id="boutique-freepack-card">
                <div class="boutique-card-top">
                    <span class="boutique-icon">🎁</span>
                    <div class="boutique-info">
                        <span class="boutique-name">Pack Gratuit (5 💎)</span>
                        <span class="boutique-sub">Stock : ${b.freePackStock}/${max}${tempsRestant !== null ? ` — Prochain dans ${this.formatTemps(tempsRestant)}` : ' (plein)'} — 10% de chance d'💚 Éclat</span>
                    </div>
                </div>
                <button class="btn-boutique" ${b.freePackStock <= 0 ? 'disabled' : ''} onclick="window.boutiqueManager.reclamerFreePack()">
                    ${b.freePackStock > 1 ? `TOUT RECLAMER (${b.freePackStock})` : (b.freePackStock === 1 ? 'RECLAMER' : 'VIDE')}
                </button>
            </div>

            <div class="boutique-card">
                <div class="boutique-card-top">
                    <span class="boutique-icon">🧬</span>
                    <div class="boutique-info">
                        <span class="boutique-name">Petit Pack de Brins</span>
                        <span class="boutique-sub">+${cfgPetit.brins} Brins Mutants</span>
                    </div>
                </div>
                <button class="btn-boutique" onclick="window.boutiqueManager.acheterPetitPack()">💎 ${cfgPetit.coutGemmes}</button>
            </div>

            <div class="boutique-card">
                <div class="boutique-card-top">
                    <span class="boutique-icon">🧬</span>
                    <div class="boutique-info">
                        <span class="boutique-name">Gros Pack de Brins</span>
                        <span class="boutique-sub">+${cfgGros.brins} Brins Mutants</span>
                    </div>
                </div>
                <button class="btn-boutique" onclick="window.boutiqueManager.acheterGrosPack()">💎 ${cfgGros.coutGemmes}</button>
            </div>

            <div class="boutique-card">
                <div class="boutique-card-top">
                    <span class="boutique-icon">💚</span>
                    <div class="boutique-info">
                        <span class="boutique-name">Éclat d'Émeraude</span>
                        <span class="boutique-sub">Monnaie de l'Arbre d'Évolution</span>
                    </div>
                </div>
                <button class="btn-boutique" onclick="window.boutiqueManager.acheterEclatEmeraude()">💎 ${cfgEclat.coutGemmes}</button>
            </div>

            <div class="boutique-card boutique-card-info">
                <span>🧬 Brins Mutants possedes :</span>
                <span class="boutique-value">${(window.gameState.brinsMutants || 0).toLocaleString()}</span>
            </div>

            <div class="boutique-card boutique-card-info">
                <span>💚 Éclats d'Émeraude possedes :</span>
                <span class="boutique-value">${(window.gameState.eclatsEmeraude || 0).toLocaleString()}</span>
            </div>
        `;
    },

    renderPerksTab: function() {
        const container = document.getElementById('boutique-tab-perks');
        if (!container) return;

        this.ensureDefaults();
        const b = window.gameState.boutique;
        const perks = this.config.perks;

        let html = '<h3>Perks</h3>';
        Object.keys(perks).forEach(key => {
            const cfg = perks[key];
            const achete = b.perks[key];
            html += `
                <div class="boutique-card">
                    <div class="boutique-card-top">
                        <span class="boutique-icon">${cfg.icon}</span>
                        <div class="boutique-info">
                            <span class="boutique-name">${cfg.name}</span>
                            <span class="boutique-sub">${achete ? 'Actif' : 'Permanent une fois achete'}</span>
                        </div>
                    </div>
                    <button class="btn-boutique ${achete ? 'achete' : ''}" ${achete ? 'disabled' : ''}
                            onclick="window.boutiqueManager.acheterPerk('${key}')">
                        ${achete ? '✔ ACTIF' : `💎 ${cfg.cout}`}
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    renderBonusTab: function() {
        const container = document.getElementById('boutique-tab-bonus');
        if (!container) return;

        this.ensureDefaults();
        const b = window.gameState.boutique;
        const cfg = this.config.symbioteSlot;

        container.innerHTML = `
            <h3>Bonus Permanent</h3>
            <div class="boutique-card">
                <div class="boutique-card-top">
                    <span class="boutique-icon">${cfg.icon}</span>
                    <div class="boutique-info">
                        <span class="boutique-name">${cfg.name}</span>
                        <span class="boutique-sub">+1 emplacement de symbiote actif (cumulable avec l'Arbre d'Évolution)</span>
                    </div>
                </div>
                <button class="btn-boutique ${b.symbioteSlotAchete ? 'achete' : ''}" ${b.symbioteSlotAchete ? 'disabled' : ''}
                        onclick="window.boutiqueManager.acheterSymbioteSlot()">
                    ${b.symbioteSlotAchete ? '✔ DEBLOQUE' : `💎 ${cfg.cout}`}
                </button>
            </div>
        `;
    },

    renderGemmesTab: function() {
        const container = document.getElementById('boutique-tab-gemmes');
        if (!container) return;

        let html = '<h3>Packs de Gemmes</h3><p class="boutique-note">Apercu uniquement — aucun paiement reel n\'est encore connecte.</p>';

        this.config.gemmePacksReels.forEach((pack, index) => {
            html += `
                <div class="boutique-card">
                    <div class="boutique-card-top">
                        <span class="boutique-icon">💎</span>
                        <div class="boutique-info">
                            <span class="boutique-name">${pack.gemmes} Gemmes</span>
                            <span class="boutique-sub">${pack.prixEuro}€</span>
                        </div>
                    </div>
                    <button class="btn-boutique btn-boutique-reel" onclick="window.boutiqueManager.acheterPackGemmesReel(${index})">
                        ${pack.prixEuro}€
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;
    },

    renderUpgradesTab: function() {
        const container = document.getElementById('boutique-tab-upgrades');
        if (!container) return;

        this.ensureDefaults();
        const b = window.gameState.boutique;
        const cfgDmg = this.config.gemmeUpgrades.secateurDamage;
        const cfgStorage = this.config.gemmeUpgrades.freePackStorage;
        const coutStorage = this.getCoutStorageActuel();
        const dmgMax = b.secateurDamageLevel >= cfgDmg.max;
        const storageMax = b.freePackStorageLevel >= cfgStorage.maxAchats;

        container.innerHTML = `
            <h3>Gemmes Upgrades</h3>

            <div class="boutique-card">
                <div class="boutique-card-top">
                    <span class="boutique-icon">${cfgDmg.icon}</span>
                    <div class="boutique-info">
                        <span class="boutique-name">${cfgDmg.name}</span>
                        <span class="boutique-sub">+${cfgDmg.step} degats par achat — ${b.secateurDamageLevel}/${cfgDmg.max}</span>
                    </div>
                </div>
                <button class="btn-boutique" ${dmgMax ? 'disabled' : ''} onclick="window.boutiqueManager.acheterGemmeUpgradeSecateur()">
                    ${dmgMax ? 'MAX' : `💎 ${cfgDmg.cout}`}
                </button>
            </div>

            <div class="boutique-card">
                <div class="boutique-card-top">
                    <span class="boutique-icon">${cfgStorage.icon}</span>
                    <div class="boutique-info">
                        <span class="boutique-name">${cfgStorage.name}</span>
                        <span class="boutique-sub">+${cfgStorage.bonusParNiveau} stock de Pack Gratuit — ${b.freePackStorageLevel}/${cfgStorage.maxAchats}</span>
                    </div>
                </div>
                <button class="btn-boutique" ${storageMax ? 'disabled' : ''} onclick="window.boutiqueManager.acheterGemmeUpgradeStorage()">
                    ${storageMax ? 'MAX' : `💎 ${coutStorage}`}
                </button>
            </div>
        `;
    },

    injectStyles: function() {
        if (document.getElementById('boutique-styles')) return;
        const style = document.createElement('style');
        style.id = 'boutique-styles';
        style.textContent = `
            .boutique-tabs .tab-btn { font-size: 0.75rem; padding: 12px 4px; }

            .boutique-card {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                background: rgba(57, 255, 20, 0.05);
                border: 1px solid var(--dim-green);
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 10px;
            }
            .boutique-card-info {
                justify-content: space-between;
                background: rgba(0,0,0,0.3);
            }
            .boutique-card-top {
                display: flex;
                align-items: center;
                gap: 10px;
                flex: 1;
            }
            .boutique-icon { font-size: 1.6rem; }
            .boutique-info { display: flex; flex-direction: column; }
            .boutique-name { font-weight: bold; color: var(--text-color); }
            .boutique-sub { font-size: 0.75rem; color: #999; }
            .boutique-value { color: var(--neon-green); font-weight: bold; }
            .boutique-note { font-size: 0.75rem; color: #888; margin-bottom: 10px; font-style: italic; }

            .btn-boutique {
                background: #1b4d1b;
                border: 1px solid var(--neon-green);
                color: #fff;
                padding: 8px 14px;
                border-radius: 5px;
                font-weight: bold;
                font-size: 0.8rem;
                cursor: pointer;
                white-space: nowrap;
                transition: 0.2s;
            }
            .btn-boutique:hover:not(:disabled) { background: #2a6e2a; box-shadow: 0 0 10px var(--neon-green); }
            .btn-boutique:disabled { background: #333; border-color: #555; color: #777; cursor: not-allowed; }
            .btn-boutique.achete { background: #0d2e0d; border-color: var(--neon-green); color: var(--neon-green); cursor: default; }
            .btn-boutique-reel { background: linear-gradient(180deg, #d4af37, #8a6d1a); border-color: #f4d97a; color: #1a1400; }
        `;
        document.head.appendChild(style);
    }
};

// Raccourci global pour ouvrir la boutique depuis n'importe quel bouton HTML
window.ouvrirBoutique = function() {
    window.boutiqueManager.ouvrirBoutique();
};
