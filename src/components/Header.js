// src/components/Header.js
import React from 'react';
import { Menu, User } from 'lucide-react';
import styles from '../styles/Header.module.css';

const Header = ({ isQueryActive }) => {
  const polyText = isQueryActive ? '' : 'Your Poly';
  const polyIcon = isQueryActive ? <span className={styles.polyIcon}>Your Poly</span> : null;

  return (
    <header className={styles.header}>
      <Menu size={24} className={styles.icon} />
      <div className={styles.titleContainer}>
        {polyIcon}
        <h1 className={styles.title}>{polyText}</h1>
      </div>
      <User size={24} className={styles.icon} />
    </header>
  );
};

export default Header;