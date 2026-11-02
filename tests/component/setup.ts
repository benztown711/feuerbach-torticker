import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/preact';

// Testing Library räumt ohne globale Test-APIs nicht selbst auf.
afterEach(() => cleanup());
