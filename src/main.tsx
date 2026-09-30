import { render } from 'preact';
import { App } from './ui/App';
import './ui/styles.css';

const root = document.querySelector('#app');
if (!root) {
  throw new Error('Missing #app');
}
render(<App />, root);
