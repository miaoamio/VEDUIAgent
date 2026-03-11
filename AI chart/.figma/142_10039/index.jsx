import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame5}>
      <div className={styles.frame2}>
        <div className={styles.frame}>
          <div className={styles.rectangle} />
          <div className={styles.ellipse} />
        </div>
        <p className={styles.now}>Now</p>
      </div>
      <div className={styles.frame4}>
        <div className={styles.frame3}>
          <div className={styles.rectangle2} />
          <div className={styles.ellipse2} />
        </div>
        <p className={styles.now}>Before</p>
      </div>
    </div>
  );
}

export default Component;
