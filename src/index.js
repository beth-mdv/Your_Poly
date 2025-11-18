// src/index.js (для React 18)

import React from 'react';
import { createRoot } from 'react-dom/client'; 
import App from './App'; 

// ! Видаліть цей рядок, якщо у вас немає файлу index.css
// import './styles/index.css';
import './styles/index.css' 

// Якщо потрібно додати глобальні стилі, переконайтеся, що файл існує, наприклад:
// import './styles/global.css'; 


const container = document.getElementById('root'); 
const root = createRoot(container); 

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);