import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame}>
      <div className={styles.rectangle} />
      <div className={styles.ellipse} />
    </div>
  );
}

export default Component;
