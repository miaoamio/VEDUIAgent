import React from 'react';

import styles from './index.module.scss';

const Component = () => {
  return (
    <div className={styles.frame3}>
      <div className={styles.frame2}>
        <p className={styles.text}>让 VED UI Agent 绘制...</p>
        <div className={styles.frame}>
          <div className={styles.micButtonIcon}>
            <img src="../image/mmm73g2x-kxpkolt.svg" className={styles.plus} />
          </div>
          <div className={styles.micButtonIcon2}>
            <img src="../image/mmm73g2x-htj017z.svg" className={styles.arrowUp} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
