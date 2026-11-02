import { render } from 'preact';
import { registerSW } from 'virtual:pwa-register';
import './styles/tokens.css';
import './styles/base.css';
import { App } from './ui/app';

const root = document.getElementById('app');
if (root) render(<App />, root);

// Service Worker für den Offline-Betrieb (FR-012). Update-Hinweis folgt mit T028.
registerSW({ immediate: true });
