/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import { AppErrorBoundary } from './components/ErrorBoundary';
import './styles/global.css';

const root = document.getElementById('root');

if (!root) {
    throw new Error('Root element not found');
}

render(() => (
    <AppErrorBoundary>
        <App />
    </AppErrorBoundary>
), root);
