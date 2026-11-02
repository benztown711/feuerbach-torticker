import { render } from 'preact';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import { App } from './ui/app';
import { getSettings } from './platform/db';
import { applyTheme, requestPersistentStorage } from './platform/storage';

// FR-018: gespeichertes Theme anwenden; FR-023: dauerhaften Speicher anfragen.
void getSettings().then((s) => applyTheme(s.theme));
void requestPersistentStorage();

const root = document.getElementById('app');
if (root) render(<App />, root);
