/** Operational gate, not an authorization boundary for private content. */
export async function startDemoViewer({ fetchConfig, loadViewer, showUnavailable }) {
  let config;
  try {
    config = await fetchConfig();
  } catch {
    showUnavailable('La démonstration 3D est temporairement indisponible. Vous pouvez consulter les annonces et leurs photos.', true);
    return;
  }

  if (config?.demo3dEnabled !== true) {
    showUnavailable('La démonstration 3D est désactivée. Retrouvez les logements et leurs photos dans les annonces.', false);
    return;
  }

  try {
    await loadViewer();
  } catch {
    showUnavailable('La visite 3D est indisponible. Vérifiez votre connexion et l’accélération graphique du navigateur.', true);
  }
}
