/* menu.js - Gestion du Menu Global (Overlay) */

// Fonction appelee par le bouton HTML
window.ouvrirMenuGlobal = function() {
    creerOverlayMenu();
};

// Fonction pour fermer le menu
window.fermerMenuGlobal = function() {
    const overlay = document.getElementById('global-menu-overlay');
    if (overlay) {
        overlay.remove();
    }
};

/**
 * Petit popup (toast) themise, utilise a la place de alert() pour les messages
 * courts (fonds insuffisants, action impossible, etc.). Se ferme tout seul.
 * @param {string} message
 * @param {'error'|'info'} type
 */
window.afficherToast = function(message, type) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            #toast-container {
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 3000;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                pointer-events: none;
                width: 90%;
                max-width: 320px;
            }
            .game-toast {
                background: rgba(13, 20, 16, 0.95);
                border: 1px solid #ff3939;
                color: #ff3939;
                padding: 8px 16px;
                border-radius: 6px;
                font-family: 'Courier New', monospace;
                font-size: 0.9rem;
                line-height: 1.2;
                font-weight: bold;
                text-align: center;
                box-shadow: 0 0 10px rgba(255, 57, 57, 0.3);
                opacity: 0;
                transform: translateY(-5px);
                transition: opacity 0.2s ease, transform 0.2s ease;
                pointer-events: auto;
                cursor: pointer;
                user-select: none;
            }
            .game-toast.toast-info {
                border-color: var(--neon-green);
                color: var(--text-color);
                box-shadow: 0 0 20px rgba(57, 255, 20, 0.5);
            }
            .game-toast.toast-visible {
                opacity: 1;
                transform: translateY(0);
            }
        `;
        document.head.appendChild(style);
    }

    const toast = document.createElement('div');
    toast.className = `game-toast ${type === 'info' ? 'toast-info' : ''}`;
    toast.innerHTML = message;
    container.appendChild(toast);

    const closeToast = () => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 200);
    };

    toast.onclick = closeToast;

    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    setTimeout(() => {
        if (toast.parentNode) closeToast();
    }, 3000);
};

window.acheterSymbioteDepuisMenu = function(type) {
    const manager = window.symbiotesManager;

    if (manager && Array.isArray(manager.achetes) && manager.achetes.some(s => s.type === type)) {
        window.afficherToast('Vous possédez déjà ce symbiote.');
        return false;
    }

    if (window.economie && manager && !window.economie.verifierFonds(manager.cost || 1000, 'gemme')) {
        window.afficherToast('💎 Gemmes insuffisantes pour acheter ce symbiote.');
        return false;
    }

    const success = window.acheterSymbiote ? window.acheterSymbiote(type) : false;
    if (success && window.refreshSymbiotesMenu) {
        window.refreshSymbiotesMenu();
    }
    return success;
};

// Fonctions de navigation dans le menu
window.ouvrirSousSectionSymbiotes = function() {
    const mainList = document.getElementById('permanent-main-list');
    const symbioteSection = document.getElementById('permanent-symbiote-section');
    if (mainList && symbioteSection) {
        mainList.style.display = 'none';
        symbioteSection.style.display = 'block';
        if (window.refreshSymbiotesMenu) {
            window.refreshSymbiotesMenu();
        }
    }
};

window.ouvrirSousSectionMutation = function() {
    const mainList = document.getElementById('permanent-main-list');
    const mutationSection = document.getElementById('permanent-mutation-section');
    if (mainList && mutationSection) {
        mainList.style.display = 'none';
        mutationSection.style.display = 'block';
        if (window.mutationManager) {
            window.mutationManager.initMutationMenu();
        }
    }
};

window.retourMenuPermanentMutation = function() {
    const mainList = document.getElementById('permanent-main-list');
    const mutationSection = document.getElementById('permanent-mutation-section');
    if (mainList && mutationSection) {
        mainList.style.display = 'block';
        mutationSection.style.display = 'none';
    }
};

window.retourMenuPermanent = function() {
    const mainList = document.getElementById('permanent-main-list');
    const symbioteSection = document.getElementById('permanent-symbiote-section');
    if (mainList && symbioteSection) {
        mainList.style.display = 'block';
        symbioteSection.style.display = 'none';
    }
};

window.ouvrirSousSectionUpgrades = function() {
    const mainList = document.getElementById('actuel-main-list');
    const upgradesSection = document.getElementById('actuel-upgrades-section');
    if (mainList && upgradesSection) {
        mainList.style.display = 'none';
        upgradesSection.style.display = 'block';
        if (window.upgradesManager) {
            window.upgradesManager.initUpgradeMenu();
        }
    }
};

window.retourMenuActuel = function() {
    const mainList = document.getElementById('actuel-main-list');
    const upgradesSection = document.getElementById('actuel-upgrades-section');
    const extractionContainer = document.getElementById('extraction-container');
    const venteContainer = document.getElementById('vente-container');
    if (mainList && upgradesSection) {
        mainList.style.display = 'block';
        upgradesSection.style.display = 'none';
        if (extractionContainer) extractionContainer.style.display = 'none';
        if (venteContainer) venteContainer.style.display = 'none';
    }
};

function creerOverlayMenu() {
    if (document.getElementById('global-menu-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'global-menu-overlay';
    overlay.className = 'menu-overlay';
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            window.fermerMenuGlobal();
        }
    };

    overlay.innerHTML = `
        <div class="menu-content">
            <div class="menu-header">
                <h2>Menu Principal</h2>
                <button class="btn-close-menu" onclick="window.fermerMenuGlobal()">✖</button>
            </div>
            
            <div class="menu-tabs">
                <button class="tab-btn active" data-tab="permanent">Permanentes</button>
                <button class="tab-btn" data-tab="actuel">Actuelles</button>
                <button class="tab-btn" data-tab="autres">Autres</button>
            </div>

            <div class="menu-body">
                
                <!-- Onglet 1: Ameliorations Permanentes -->
                <div id="tab-permanent" class="menu-section active-section">
                    
                    <!-- Liste principale des ameliorations -->
                    <div id="permanent-main-list">
                        <h3>Ameliorations Permanentes</h3>
                        <div class="grid-buttons">
                            <button class="menu-action-btn highlight-btn" onclick="window.ouvrirArbreEvolution(); window.fermerMenuGlobal();"><span class="icon">🌳</span> L'Arbre d'Evolution</button>
<button class="menu-action-btn highlight-btn" onclick="window.ouvrirSousSectionMutation()"><span class="icon">🧬</span> Mutation Génétique</button>                            <button class="menu-action-btn" onclick="alert('L\\'Herbier Genetique: En construction')"><span class="icon">📖</span> L'Herbier Genetique</button>
                            <button class="menu-action-btn" onclick="alert('L\\'Horloge Circadienne: En construction')"><span class="icon">🕰️</span> L'Horloge Circadienne</button>
                            <button class="menu-action-btn" onclick="alert('Paleobotanique: En construction')"><span class="icon">🦖</span> Paleobotanique & Eco-Fouilles</button>
                            
                            <!-- Bouton pour ouvrir la sous-section Symbiotes -->
                            <button class="menu-action-btn highlight-btn" onclick="window.ouvrirSousSectionSymbiotes()">
                                <span class="icon">🍄</span> Symbiotes de Terrain
                            </button>
                            
                            <button class="menu-action-btn" onclick="alert('Laboratoire de Botanique: En construction')"><span class="icon">🧪</span> Laboratoire de Botanique</button>
                            <button class="menu-action-btn" onclick="alert('Culture Hydroponique: En construction')"><span class="icon">💧</span> Culture Hydroponique</button>
                            <button class="menu-action-btn" onclick="alert('Infrastructures: En construction')"><span class="icon">🏗️</span> Infrastructures de la Serre</button>
                        </div>
                    </div>

                    <!-- Sous-section dediee aux Symbiotes -->
                    <div id="permanent-symbiote-section" style="display: none;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                            <button class="btn-back" onclick="window.retourMenuPermanent()">⬅</button>
                            <h3 style="margin: 0;">Symbiotes de Terrain</h3>
                        </div>
                        
                        <div class="grid-buttons" style="grid-template-columns: 1fr 1fr; margin-bottom: 20px;">
                            <button id="btn-buy-ver-racinaire" class="menu-action-btn" onclick="window.acheterSymbioteDepuisMenu('ver-racinaire')">
                                <span class="icon">🐛</span> Ver-Racinaire (1000💎)
                            </button>
                            <button id="btn-buy-nevro-parasite" class="menu-action-btn" onclick="window.acheterSymbioteDepuisMenu('nevro-parasite')">
                                <span class="icon">🧠</span> Nevro-Parasite (1000💎)
                            </button>
                            <button id="btn-buy-spore-porteur" class="menu-action-btn" onclick="window.acheterSymbioteDepuisMenu('spore-porteur')">
                                <span class="icon">🍄</span> Spore-Porteur (1000💎)
                            </button>
                            <button id="btn-buy-phyto-drone" class="menu-action-btn" onclick="window.acheterSymbioteDepuisMenu('phyto-drone')">
                                <span class="icon">🤖</span> Phyto-Drone (1000💎)
                            </button>
                            <button id="btn-buy-chloromage" class="menu-action-btn" onclick="window.acheterSymbioteDepuisMenu('chloromage')">
                                <span class="icon">🧙</span> Chloromage (1000💎)
                            </button>
                            <button id="btn-buy-scarabee-seve" class="menu-action-btn" onclick="window.acheterSymbioteDepuisMenu('scarabee-seve')">
                                <span class="icon">🪲</span> Scarabée de Sève (1000💎)
                            </button>
                        </div>

                        <div id="symbiotes-slots-info" class="symbiotes-slots-info">0/2 emplacements actifs</div>

                        <h4 style="color: var(--neon-green); margin-bottom: 10px; border-bottom: 1px solid var(--dim-green); padding-bottom: 5px;">Mes Symbiotes</h4>
                        <div id="symbiotes-list-container" style="display: flex; flex-direction: column; gap: 10px;"></div>
                    </div>

                    <!-- Sous-section dédiée à la Mutation Génétique -->
                    <div id="permanent-mutation-section" style="display: none;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                            <button class="btn-back" onclick="window.retourMenuPermanentMutation()">⬅</button>
                            <h3 style="margin: 0;">Mutation Génétique</h3>
                        </div>
                        <div id="mutation-container"></div>
                    </div>
                </div>

                <!-- Onglet 2: Ameliorations Actuelles -->
                <div id="tab-actuel" class="menu-section">
                    <div id="actuel-main-list">
                        <h3>Ameliorations Actuelles</h3>
                        <div class="grid-buttons">
                            <button class="menu-action-btn" onclick="window.initExtractionMenu(); document.getElementById('extraction-container').style.display='block'; document.getElementById('actuel-main-list').style.display='none';"><span class="icon">⛏️</span> Extraction</button>

                            <button class="menu-action-btn" onclick="window.initVenteMenu(); document.getElementById('vente-container').style.display='block'; document.getElementById('actuel-main-list').style.display='none';"><span class="icon">💰</span> Sell</button>
                            
                            <!-- Nouveau bouton Upgrades -->
                            <button class="menu-action-btn highlight-btn" onclick="window.ouvrirSousSectionUpgrades()">
                                <span class="icon">⚡</span> Upgrades
                            </button>
                            
                            <button class="menu-action-btn" onclick="alert('Crises Ecologiques: En construction')"><span class="icon">🌪️</span> Les Crises Ecologiques</button>
                        </div>
                    </div>
                    
                    <!-- Conteneur Extraction -->
                    <div id="extraction-container" style="display: none; margin-top: 10px;">
                        <button class="btn-back" style="margin-bottom: 15px;" onclick="document.getElementById('extraction-container').style.display='none'; document.getElementById('actuel-main-list').style.display='block';">⬅ Retour</button>
                    </div>

                    <!-- Conteneur Vente -->
                    <div id="vente-container" style="display: none; margin-top: 10px;">
                        <button class="btn-back" style="margin-bottom: 15px;" onclick="document.getElementById('vente-container').style.display='none'; document.getElementById('actuel-main-list').style.display='block';">⬅ Retour</button>
                    </div>

                    <!-- Sous-section Upgrades -->
                    <div id="actuel-upgrades-section" style="display: none;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                            <button class="btn-back" onclick="window.retourMenuActuel()">⬅</button>
                            <h3 style="margin: 0;">Ameliorations de Stats</h3>
                        </div>
                        <p style="font-size: 0.8rem; color: #888; margin-bottom: 15px;">Depensez vos seves pour augmenter les capacites de votre secateur.</p>
                        <div id="upgrades-container"></div>
                    </div>
                </div>

                <!-- Onglet 3: Autres -->
                <div id="tab-autres" class="menu-section">
                    <h3>Autres</h3>
                    <div class="grid-buttons">
                        <button class="menu-action-btn" onclick="window.ouvrirParametres(); window.fermerMenuGlobal();"><span class="icon">⚙️</span> Parametres</button>
                        <button class="menu-action-btn" onclick="window.afficherStats(); window.fermerMenuGlobal();"><span class="icon">📊</span> Stats</button>
                        <button class="menu-action-btn highlight-btn" onclick="window.ouvrirBoutique(); window.fermerMenuGlobal();"><span class="icon">🛒</span> Boutique</button>
                        <button class="menu-action-btn admin-btn-style" onclick="window.ouvrirPanelAdmin(); window.fermerMenuGlobal();">
                            <span class="icon">🔒</span> Mode Admin
                        </button>
                    </div>
                    <div id="stats-content"></div>
                </div>

            </div>
        </div>
    `;

    // Logique des onglets
    const tabBtns = overlay.querySelectorAll('.tab-btn');
    const sections = overlay.querySelectorAll('.menu-section');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sections.forEach(sec => sec.classList.remove('active-section'));
            const targetId = 'tab-' + btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active-section');
            
            // Reset les vues si on change d'onglet
            if (btn.getAttribute('data-tab') !== 'permanent') {
                window.retourMenuPermanent();
                window.retourMenuPermanentMutation();
            }
            if (btn.getAttribute('data-tab') !== 'actuel') {
                window.retourMenuActuel();
            }
        });
    });

    // Styles CSS
    if (!document.getElementById('menu-styles')) {
        const style = document.createElement('style');
        style.id = 'menu-styles';
        style.textContent = `
            .menu-overlay {
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(5, 10, 5, 0.95);
                z-index: 1000;
                display: flex;
                justify-content: center;
                align-items: center;
                backdrop-filter: blur(5px);
            }
            .menu-content {
                background: var(--panel-bg);
                border: 2px solid var(--neon-green);
                border-radius: 10px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 0 30px var(--neon-green);
                display: flex;
                flex-direction: column;
            }
            .menu-header {
                padding: 15px;
                border-bottom: 1px solid var(--dim-green);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .menu-header h2 {
                color: var(--neon-green);
                text-shadow: 0 0 5px var(--neon-green);
                margin: 0;
            }
            .btn-close-menu {
                background: transparent;
                border: none;
                color: var(--text-color);
                font-size: 1.5rem;
                cursor: pointer;
            }
            .btn-back {
                background: rgba(57, 255, 20, 0.1);
                border: 1px solid var(--neon-green);
                color: var(--neon-green);
                padding: 5px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 1.2rem;
            }
            .menu-tabs {
                display: flex;
                background: rgba(0,0,0,0.2);
            }
            .tab-btn {
                flex: 1;
                padding: 15px;
                background: transparent;
                border: none;
                color: var(--dim-green);
                cursor: pointer;
                font-family: inherit;
                border-bottom: 2px solid transparent;
                transition: 0.3s;
            }
            .tab-btn.active {
                color: var(--neon-green);
                border-bottom: 2px solid var(--neon-green);
                text-shadow: 0 0 5px var(--neon-green);
            }
            .menu-body {
                padding: 20px;
            }
            .menu-section {
                display: none;
            }
            .menu-section.active-section {
                display: block;
            }
            .menu-section h3 {
                color: var(--text-color);
                margin-bottom: 15px;
                border-bottom: 1px dashed var(--dim-green);
                padding-bottom: 5px;
            }
            .grid-buttons {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 10px;
            }
            .menu-action-btn {
                background: rgba(57, 255, 20, 0.05);
                border: 1px solid var(--dim-green);
                color: var(--text-color);
                padding: 10px;
                cursor: pointer;
                text-align: left;
                border-radius: 5px;
                transition: 0.2s;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .menu-action-btn:hover {
                background: rgba(57, 255, 20, 0.2);
                border-color: var(--neon-green);
            }
            .highlight-btn {
                border-color: var(--neon-green);
                box-shadow: 0 0 10px rgba(57, 255, 20, 0.2);
                font-weight: bold;
            }
            .menu-action-btn-owned {
                opacity: 0.6;
                cursor: not-allowed;
                border-color: var(--dim-green) !important;
                box-shadow: none !important;
                background: rgba(0, 0, 0, 0.3) !important;
            }
            .menu-action-btn-owned:hover {
                background: rgba(0, 0, 0, 0.3) !important;
                border-color: var(--dim-green) !important;
            }
            .owned-tag {
                margin-left: auto;
                font-size: 0.75rem;
                color: #39ff14;
                font-weight: bold;
            }
            .symbiote-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px;
                border: 1px solid var(--dim-green);
                border-radius: 5px;
                background: rgba(57, 255, 20, 0.05);
            }
            .symbiotes-slots-info {
                text-align: center;
                font-size: 0.85rem;
                font-weight: bold;
                color: var(--neon-green);
                background: rgba(57, 255, 20, 0.08);
                border: 1px solid var(--dim-green);
                border-radius: 5px;
                padding: 8px;
                margin-bottom: 15px;
                transition: 0.2s;
            }
            .symbiotes-slots-info.slots-full {
                color: #ffb347;
                background: rgba(255, 179, 71, 0.1);
                border-color: #ffb347;
            }
            .icon {
                font-size: 1.2rem;
            }
            .admin-btn-style {
                border: 1px solid #ff3939;
                color: #ffcccc;
                background: rgba(255, 57, 57, 0.05);
                font-weight: bold;
            }
            .admin-btn-style:hover {
                background: rgba(255, 57, 57, 0.2);
                border-color: #ff3939;
                box-shadow: 0 0 10px rgba(255, 57, 57, 0.5);
            }
            /* Style pour les boutons déjà achetés */
            .menu-action-btn-owned {
                background: rgba(57, 255, 20, 0.1);
                border-color: var(--neon-green);
                color: var(--neon-green);
                cursor: default;
            }
            .owned-tag {
                margin-left: auto;
                font-size: 0.8rem;
                background: var(--neon-green);
                color: #000;
                padding: 2px 5px;
                border-radius: 3px;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(overlay);
}

// Fonction wrapper pour l'achat
window.acheterSymbiote = function(type) {
    if (window.symbiotesManager && window.symbiotesManager.acheter) {
        const success = window.symbiotesManager.acheter(type);
        if (success) {
            if (window.refreshSymbiotesMenu) {
                window.refreshSymbiotesMenu();
            }
            return true;
        }
    }
    return false;
};

// Fonction pour rafraichir la liste des symbiotes dans le menu
window.refreshSymbiotesMenu = function() {
    const container = document.getElementById('symbiotes-list-container');
    if (!container || !window.symbiotesManager) return;

    container.innerHTML = '';

    const manager = window.symbiotesManager;
    const symbiotes = Array.isArray(manager.achetes) ? manager.achetes : [];
    const maxActifs = manager.maxActifs || 2;
    const currentActifs = Array.isArray(manager.actifs) ? manager.actifs.length : 0;

    // --- Compteur permanent des emplacements de symbiotes (toujours visible) ---
    const slotsInfo = document.getElementById('symbiotes-slots-info');
    if (slotsInfo) {
        slotsInfo.textContent = `${currentActifs}/${maxActifs} emplacements actifs`;
        slotsInfo.classList.toggle('slots-full', currentActifs >= maxActifs);
    }

    // --- Mise à jour des boutons d'achat ---
    const dejaPossede = (type) => symbiotes.some(s => s.type === type);

    const configBoutonsAchat = [
        { id: 'btn-buy-ver-racinaire', type: 'ver-racinaire', icon: '🐛', label: 'Ver-Racinaire' },
        { id: 'btn-buy-nevro-parasite', type: 'nevro-parasite', icon: '🧠', label: 'Nevro-Parasite' },
        { id: 'btn-buy-spore-porteur', type: 'spore-porteur', icon: '🍄', label: 'Spore-Porteur' },
        { id: 'btn-buy-phyto-drone', type: 'phyto-drone', icon: '🤖', label: 'Phyto-Drone' },
        { id: 'btn-buy-chloromage', type: 'chloromage', icon: '🧙', label: 'Chloromage' },
        { id: 'btn-buy-scarabee-seve', type: 'scarabee-seve', icon: '🪲', label: 'Scarabée de Sève' }
    ];

    configBoutonsAchat.forEach(conf => {
        const btn = document.getElementById(conf.id);
        if (!btn) return;

        if (dejaPossede(conf.type)) {
            btn.classList.add('menu-action-btn-owned');
            btn.disabled = true;
            btn.innerHTML = `<span class="icon">${conf.icon}</span> ${conf.label} <span class="owned-tag">✅ Acheté</span>`;
        } else {
            btn.classList.remove('menu-action-btn-owned');
            btn.disabled = false;
            btn.innerHTML = `<span class="icon">${conf.icon}</span> ${conf.label} (1000💎)`;
        }
    });

    if (symbiotes.length === 0) {
        container.innerHTML = '<div style="color: #666; font-size: 0.8rem; text-align: center; padding: 10px;">Aucun symbiote achete.</div>';
        return;
    }

    symbiotes.forEach(symb => {
        const item = document.createElement('div');
        item.className = 'symbiote-item';
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.justifyContent = 'space-between';
        item.style.background = 'rgba(0,0,0,0.3)';
        item.style.padding = '10px';
        item.style.borderRadius = '5px';
        item.style.border = '1px solid var(--dim-green)';

        const infoDiv = document.createElement('div');
        const noms = {
            'ver-racinaire': '🐛 Ver Racinaire',
            'nevro-parasite': '🧠 Nevro-Parasite',
            'spore-porteur': '🍄 Spore-Porteur',
            'phyto-drone': '🤖 Phyto-Drone',
            'chloromage': '🧙 Chloromage',
            'scarabee-seve': '🪲 Scarabée de Sève'
        };
        const name = noms[symb.type] || symb.type;
        const statusText = symb.isActive ? '● Actif' : '○ Inactif';
        const statusColor = symb.isActive ? '#39ff14' : '#ff3939';

        infoDiv.innerHTML = `
            <div style="font-weight: bold; color: var(--text-color);">${name}</div>
            <div style="font-size: 0.8rem; color: ${statusColor};">${statusText}</div>
        `;

        const btn = document.createElement('button');
        btn.className = 'menu-action-btn';
        btn.style.padding = '5px 10px';
        btn.style.fontSize = '0.8rem';
        btn.innerText = symb.isActive ? 'Desactiver' : 'Activer';

        btn.onclick = () => {
            if (window.symbiotesManager && window.symbiotesManager.toggle) {
                window.symbiotesManager.toggle(symb.id);
            }
        };

        if (!symb.isActive && currentActifs >= maxActifs) {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.title = `Limite de ${maxActifs} symbiotes actifs atteinte`;
        }

        item.appendChild(infoDiv);
        item.appendChild(btn);
        container.appendChild(item);
    });
};
