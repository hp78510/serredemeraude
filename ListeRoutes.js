/* ListeRoutes.js - Overlay listant les 30 routes avec les plantes qu'on y trouve.
   Les routes pas encore debloquees sont camouflees (icones floutees/assombries + cadenas). */

window.routesListeManager = {

    ouvrir: function() {
        if (document.getElementById('routes-liste-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'routes-liste-overlay';
        overlay.className = 'menu-overlay';
        overlay.onclick = (e) => { if (e.target === overlay) this.fermer(); };

        overlay.innerHTML = `
            <div class="menu-content" style="border-color:#57d2ff; box-shadow:0 0 30px #57d2ff;">
                <div class="menu-header">
                    <h2 style="color:#57d2ff; text-shadow:0 0 8px #57d2ff;">🗺️ Liste des Routes</h2>
                    <button class="btn-close-menu" onclick="window.routesListeManager.fermer()">✖</button>
                </div>
                <div class="menu-body">
                    <div id="routes-liste-container"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        this.injectStyles();
        this.render();
    },

    fermer: function() {
        const overlay = document.getElementById('routes-liste-overlay');
        if (overlay) overlay.remove();
    },

    /**
     * Construit la liste des routes. Pour chaque route r, on affiche (par ordre
     * croissant d'indice, donc de la plus ancienne a la plus recente) : la plante
     * de la route precedente (si elle existe) puis la plante propre a cette route.
     * Route 1 -> 1 seule icone. Routes 2+ -> 2 icones.
     */
    render: function() {
        const container = document.getElementById('routes-liste-container');
        if (!container || !window.PLANT_DB) return;

        const db = window.PLANT_DB;
        const unlockedRoute = (window.gameState && window.gameState.unlockedRoute) || 1;
        const currentRoute = (window.gameState && window.gameState.currentRoute) || 1;

        let html = '';

        for (let r = 1; r <= db.length; r++) {
            const debloquee = r <= unlockedRoute;
            const currentIdx = r - 1;
            const prevIdx = r - 2;

            // Ordre croissant : plante de la route precedente d'abord, puis celle de cette route
            const plantesAsc = [];
            if (prevIdx >= 0) plantesAsc.push(db[prevIdx]);
            plantesAsc.push(db[currentIdx]);

            const plantesHtml = plantesAsc.map(p => {
                const classeVerrou = debloquee ? '' : 'route-liste-plant-verrouillee';
                const imgHtml = window.creerImgPlanteHTML(p.name, `route-liste-plant-img ${classeVerrou}`);
                return `
                    <span class="route-liste-plant-wrap" title="${debloquee ? p.name : '???'}">
                        ${imgHtml}
                        ${debloquee ? '' : '<span class="route-liste-lock-overlay">🔒</span>'}
                    </span>
                `;
            }).join('');

            const estRouteActuelle = r === currentRoute;

            let actionHtml = '';
            if (debloquee) {
                if (estRouteActuelle) {
                    actionHtml = '<span class="btn-teleport-route actuelle">Actuelle</span>';
                } else {
                    actionHtml = `<button class="btn-teleport-route" onclick="window.goToRoute(${r})">Aller</button>`;
                }
            }

            html += `
                <div class="route-liste-row ${debloquee ? '' : 'route-liste-row-verrouillee'} ${estRouteActuelle ? 'route-liste-row-actuelle' : ''}">
                    <span class="route-liste-numero">${debloquee ? r : '🔒'}</span>
                    <div class="route-liste-plantes">${plantesHtml}</div>
                    ${actionHtml}
                </div>
            `;
        }

        container.innerHTML = html;
    },

    injectStyles: function() {
        if (document.getElementById('routes-liste-styles')) return;
        const style = document.createElement('style');
        style.id = 'routes-liste-styles';
        style.textContent = `
            /* Styles de base de l'overlay (dupliques pour rendre ce module autonome :
               le bouton est accessible directement depuis la zone de jeu, sans passer
               par le menu principal, donc on ne peut pas compter sur menu.js) */
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
                font-size: 1.1rem;
            }
            .btn-close-menu {
                background: transparent;
                border: none;
                color: var(--text-color);
                font-size: 1.5rem;
                cursor: pointer;
            }
            .menu-body { padding: 12px 15px; }

            /* --- Liste des routes --- */
            .route-liste-row {
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 8px 10px;
                border-bottom: 1px solid var(--dim-green);
                transition: 0.15s;
            }
            .route-liste-row:last-child { border-bottom: none; }
            .route-liste-row-actuelle {
                background: rgba(87, 210, 255, 0.1);
                border-radius: 6px;
                box-shadow: 0 0 8px rgba(87, 210, 255, 0.2);
            }
            .route-liste-row-verrouillee { opacity: 0.6; }

            .route-liste-numero {
                width: 32px;
                flex-shrink: 0;
                text-align: center;
                font-weight: bold;
                color: #57d2ff;
                font-size: 0.9rem;
            }
            .route-liste-row-verrouillee .route-liste-numero {
                color: #555;
                font-size: 0.85rem;
            }

            .route-liste-plantes {
                display: flex;
                gap: 8px;
            }
            .route-liste-plant-wrap {
                position: relative;
                width: 34px;
                height: 34px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,0.3);
                border: 1px solid var(--dim-green);
                border-radius: 6px;
                overflow: hidden;
            }
            .route-liste-plant-img {
                width: 28px;
                height: 28px;
                object-fit: contain;
            }
            /* Camouflage : icone floutee, assombrie et desaturee pour les routes non debloquees */
            .route-liste-plant-verrouillee {
                filter: blur(3px) brightness(0.2) grayscale(1);
            }
            .route-liste-lock-overlay {
                position: absolute;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.85rem;
                text-shadow: 0 0 4px #000;
            }

            /* --- BOUTON TELEPORTATION --- */
            .btn-teleport-route {
                background: rgba(87, 210, 255, 0.1);
                border: 1px solid #57d2ff;
                color: #57d2ff;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.75rem;
                cursor: pointer;
                transition: all 0.2s;
                margin-left: auto;
            }
            .btn-teleport-route:hover {
                background: rgba(87, 210, 255, 0.3);
                box-shadow: 0 0 8px #57d2ff;
            }
            .btn-teleport-route.actuelle {
                border-color: var(--neon-green);
                color: var(--neon-green);
                background: rgba(57, 255, 20, 0.1);
                cursor: default;
            }

            @media screen and (max-width: 480px) {
                .route-liste-plant-wrap { width: 30px; height: 30px; }
                .route-liste-plant-img { width: 24px; height: 24px; }
            }
        `;
        document.head.appendChild(style);
    }
};

// Raccourci global appele par le bouton HTML
window.ouvrirListeRoutes = function() {
    window.routesListeManager.ouvrir();
};
