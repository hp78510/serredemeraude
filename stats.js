/* stats.js - Affichage des statistiques */

// Fonction appelee par le bouton HTML de la barre de nav
window.afficherStats = function() {
    creerOverlayStats();
};

// Compatibilite avec les boutons existants
window.afficherStatsSecateur = function() {
    window.afficherStats();
};

// Fonction pour fermer l'overlay stats
window.fermerStats = function() {
    const overlay = document.getElementById('stats-overlay');
    if (overlay) {
        overlay.remove();
    }
};

function creerOverlayStats() {
    if (document.getElementById('stats-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'stats-overlay';
    overlay.className = 'menu-overlay';
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            window.fermerStats();
        }
    };

    const secateur = window.secateur || { damage: 0, critChance: 0, critDamage: 0, radius: 0, attackSpeed: 0 };
    const gameState = window.gameState || { currentRoute: 1, wavesCompleted: 0, unlockedRoute: 1, golds: 0, gemmes: 0, upgrades: {} };
    const symbiotesManager = window.symbiotesManager || { achetes: [], actifs: [], maxActifs: 2, aoeBonus: 0, speedBonus: 0 };
    const upgradesManager = window.upgradesManager || { types: {} };

    // --- Compte des ressources (quantites totales, pas juste le nombre de types) ---
    const inventairePlantes = gameState.inventairePlantes || {};
    const inventaireSeves = gameState.inventaireSeves || {};
    const totalPlantes = Object.values(inventairePlantes).reduce((sum, n) => sum + n, 0);
    const totalSeves = Object.values(inventaireSeves).reduce((sum, n) => sum + n, 0);
    const totalPointsSeve = (window.upgradesManager && window.upgradesManager.getAvailableResources)
        ? window.upgradesManager.getAvailableResources().totalPoints
        : 0;

    // --- Stats effectives des symbiotes (degats/crit/rayon en direct, comme en jeu) ---
    const symbiotesPossedes = symbiotesManager.achetes || [];
    const symbiotesActifsCount = (symbiotesManager.actifs || []).length;
    const statsEffectives = symbiotesManager.getStats ? symbiotesManager.getStats() : {
        damage: 0, critChance: 0, critDamage: 1, attackSpeed: 0, radius: 0
    };
    const vitesseDeplacement = 3 + (symbiotesManager.speedBonus || 0);

    const nomSymbiote = (type) => {
        if (type === 'ver-racinaire') return '🐛 Ver-Racinaire';
        if (type === 'nevro-parasite') return '🧠 Nevro-Parasite';
        if (type === 'spore-porteur') return '🍄 Spore-Porteur';
        if (type === 'phyto-drone') return '🤖 Phyto-Drone';
        if (type === 'chloromage') return '🧙 Chloromage';
        if (type === 'scarabee-seve') return '🪲 Scarabée de Sève';
        return type;
    };

    const symbiotesListeHtml = symbiotesPossedes.length > 0
        ? symbiotesPossedes.map(s => {
            const statutTxt = s.isActive ? '● Actif' : '○ Inactif';
            const statutColor = s.isActive ? '#39ff14' : '#ff3939';
            return `
                <div class="stat-row">
                    <span>${nomSymbiote(s.type)} :</span>
                    <span class="stat-value" style="color:${statutColor}">${statutTxt}</span>
                </div>
            `;
        }).join('')
        : `<div class="stat-row"><span style="opacity:0.6">Aucun symbiote achete</span></div>`;

    // --- Niveaux des ameliorations (toutes celles definies dans upgradesManager) ---
    const niveauxUpgrades = gameState.upgrades || {};
    const upgradesListeHtml = Object.keys(upgradesManager.types || {}).map(typeId => {
        const def = upgradesManager.types[typeId];
        const level = niveauxUpgrades[typeId] || 0;
        return `
            <div class="stat-row">
                <span>${def.icon} ${def.name} :</span>
                <span class="stat-value">Niveau ${level}</span>
            </div>
        `;
    }).join('');

    overlay.innerHTML = `
        <div class="menu-content">
            <div class="menu-header">
                <h2>Statistiques Globales</h2>
                <button class="btn-close-menu" onclick="window.fermerStats()">✖</button>
            </div>
            
            <div class="stats-container">
                <div class="stats-section">
                    <h3>🌍 Progression</h3>
                    <div class="stat-row">
                        <span>Niveau :</span>
                        <span class="stat-value">${gameState.niveau || 1} 🔒 / ${gameState.niveauMaxDebloque || 10}</span>
                    </div>
                    <div class="stat-row">
                        <span>XP :</span>
                        <span class="stat-value">${Math.floor(gameState.xp || 0)} / ${window.xpRequisPourNiveau ? window.xpRequisPourNiveau(gameState.niveau || 1) : 100}</span>
                    </div>
                    <div class="stat-row">
                        <span>👑 Niveau du Boss :</span>
                        <span class="stat-value">${(gameState.boss && gameState.boss.niveau) || 1}</span>
                    </div>
                    <div class="stat-row">
                        <span>Route Actuelle :</span>
                        <span class="stat-value">${gameState.currentRoute}</span>
                    </div>
                    <div class="stat-row">
                        <span>Routes Debloquees :</span>
                        <span class="stat-value">${gameState.unlockedRoute}</span>
                    </div>
                    <div class="stat-row">
                        <span>Vagues Completees (Route Act.) :</span>
                        <span class="stat-value">${gameState.wavesCompleted}</span>
                    </div>
                </div>

                <div class="stats-section">
                    <h3>💰 Economie</h3>
                    <div class="stat-row">
                        <span>💰 Golds :</span>
                        <span class="stat-value">${gameState.golds || 0}</span>
                    </div>
                    <div class="stat-row">
                        <span>💎 Gemmes :</span>
                        <span class="stat-value">${gameState.gemmes || 0}</span>
                    </div>
                </div>

                <div class="stats-section">
                    <h3>✂️ Secateur</h3>
                    <div class="stat-row">
                        <span>Degats de base :</span>
                        <span class="stat-value">${secateur.damage}</span>
                    </div>
                    <div class="stat-row">
                        <span>Rayon d'impact :</span>
                        <span class="stat-value">${secateur.radius}px</span>
                    </div>
                    <div class="stat-row">
                        <span>Chance de Crit :</span>
                        <span class="stat-value">${(secateur.critChance * 100).toFixed(0)}%</span>
                    </div>
                    <div class="stat-row">
                        <span>Multiplicateur Crit :</span>
                        <span class="stat-value">x${secateur.critDamage}</span>
                    </div>
                    <div class="stat-row">
                        <span>Vitesse d'attaque :</span>
                        <span class="stat-value">${secateur.attackSpeed}ms</span>
                    </div>
                </div>

                <div class="stats-section">
                    <h3>🍄 Symbiotes</h3>
                    <div class="stat-row">
                        <span>Symbiotes possedes :</span>
                        <span class="stat-value">${symbiotesPossedes.length}</span>
                    </div>
                    <div class="stat-row">
                        <span>Emplacements actifs :</span>
                        <span class="stat-value">${symbiotesActifsCount}/${symbiotesManager.maxActifs}</span>
                    </div>
                    <div class="stat-row">
                        <span>Cout d'achat d'un symbiote :</span>
                        <span class="stat-value">💎 ${(symbiotesManager.cost || 0).toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span>Degats (en direct) :</span>
                        <span class="stat-value">${statsEffectives.damage}</span>
                    </div>
                    <div class="stat-row">
                        <span>Rayon d'action :</span>
                        <span class="stat-value">${statsEffectives.radius}px</span>
                    </div>
                    <div class="stat-row">
                        <span>Chance de Crit :</span>
                        <span class="stat-value">${(statsEffectives.critChance * 100).toFixed(0)}%</span>
                    </div>
                    <div class="stat-row">
                        <span>Multiplicateur Crit :</span>
                        <span class="stat-value">x${statsEffectives.critDamage}</span>
                    </div>
                    <div class="stat-row">
                        <span>Vitesse d'attaque :</span>
                        <span class="stat-value">${statsEffectives.attackSpeed}ms</span>
                    </div>
                    <div class="stat-row">
                        <span>Vitesse de deplacement :</span>
                        <span class="stat-value">${vitesseDeplacement.toFixed(1)} px/frame</span>
                    </div>
                    <div style="border-top: 1px dashed var(--dim-green); margin: 10px 0; padding-top: 8px;">
                        ${symbiotesListeHtml}
                    </div>
                </div>

                <div class="stats-section">
                    <h3>⚡ Ameliorations</h3>
                    ${upgradesListeHtml || `<div class="stat-row"><span style="opacity:0.6">Aucune amelioration disponible</span></div>`}
                </div>

                <div class="stats-section">
                    <h3>🎒 Inventaire Resume</h3>
                    <div class="stat-row">
                        <span>Especes de plantes decouvertes :</span>
                        <span class="stat-value">${Object.keys(inventairePlantes).length} / ${(window.PLANT_DB || []).length}</span>
                    </div>
                    <div class="stat-row">
                        <span>Total de plantes recoltees :</span>
                        <span class="stat-value">${totalPlantes.toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span>Types de seves extraites :</span>
                        <span class="stat-value">${Object.keys(inventaireSeves).length}</span>
                    </div>
                    <div class="stat-row">
                        <span>Total de seves extraites :</span>
                        <span class="stat-value">${totalSeves.toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span>Points de seve disponibles (upgrades) :</span>
                        <span class="stat-value">${totalPointsSeve.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    if (!document.getElementById('stats-overlay-styles')) {
        const style = document.createElement('style');
        style.id = 'stats-overlay-styles';
        style.textContent = `
            .stats-container {
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .stats-section {
                background: rgba(0,0,0,0.2);
                padding: 15px;
                border-radius: 8px;
                border: 1px solid var(--dim-green);
            }
            .stats-section h3 {
                color: var(--neon-green);
                margin-top: 0;
                margin-bottom: 10px;
                border-bottom: 1px dashed var(--dim-green);
                padding-bottom: 5px;
            }
            .stat-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 0.95rem;
            }
            .stat-row span:first-child {
                color: #ccc;
            }
            .stat-value {
                color: #fff;
                font-weight: bold;
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(overlay);
}
