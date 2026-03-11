import React from 'react';

import styles from './index.module.scss';

const imgSrc = (fileName) => new URL(`../image/${fileName}`, import.meta.url).toString();

const onImgError = (fileName) => (event) => {
  console.error(`Image not found: ${fileName}`);
  event.currentTarget.remove();
};

const Component = () => {
  return (
    <div className={styles.frame1912056450}>
      <div className={styles.instance4}>
        <div className={styles.instance}>
          <div className={styles.yAixValueLabel}>
            <p className={styles.a1000}>1000</p>
            <p className={styles.a1000}>ms</p>
          </div>
          <div className={styles.yAixValueLabel}>
            <p className={styles.a1000}>800</p>
            <p className={styles.a1000}>ms</p>
          </div>
          <div className={styles.yAixValueLabel}>
            <p className={styles.a1000}>600</p>
            <p className={styles.a1000}>ms</p>
          </div>
          <div className={styles.yAixValueLabel}>
            <p className={styles.a1000}>400</p>
            <p className={styles.a1000}>ms</p>
          </div>
          <div className={styles.yAixValueLabel}>
            <p className={styles.a1000}>200</p>
            <p className={styles.a1000}>ms</p>
          </div>
          <div className={styles.yAixValueLabel}>
            <p className={styles.a1000}>0</p>
            <p className={styles.a1000}>ms</p>
          </div>
        </div>
        <div className={styles.frame1912056411}>
          <div className={styles.grid}>
            <div className={styles.instance2}>
              <div className={styles.frame1912056441}>
                <img
                  src={imgSrc('mmbmikny-tn6jqxh.svg')}
                  onError={onImgError('mmbmikny-tn6jqxh.svg')}
                  className={styles.frame}
                />
                <div className={styles.frame6}>
                  <img
                    src={imgSrc('mmbmikny-f21hoje.svg')}
                    onError={onImgError('mmbmikny-f21hoje.svg')}
                    className={styles.frame2}
                  />
                  <div className={styles.frame4}>
                    <img
                      src={imgSrc('mmbmikny-udc04ty.svg')}
                      onError={onImgError('mmbmikny-udc04ty.svg')}
                      className={styles.frame3}
                    />
                  </div>
                  <img
                    src={imgSrc('mmbmikny-h1vt038.svg')}
                    onError={onImgError('mmbmikny-h1vt038.svg')}
                    className={styles.frame5}
                  />
                  <img
                    src={imgSrc('mmbmikny-82glfff.svg')}
                    onError={onImgError('mmbmikny-82glfff.svg')}
                    className={styles.gridLine3}
                  />
                  <img
                    src={imgSrc('mmbmikny-82glfff.svg')}
                    onError={onImgError('mmbmikny-82glfff.svg')}
                    className={styles.gridLine4}
                  />
                </div>
              </div>
              <img
                src={imgSrc('mmbmikny-82glfff.svg')}
                onError={onImgError('mmbmikny-82glfff.svg')}
                className={styles.gridLine1}
              />
              <img
                src={imgSrc('mmbmikny-82glfff.svg')}
                onError={onImgError('mmbmikny-82glfff.svg')}
                className={styles.gridLine2}
              />
              <img
                src={imgSrc('mmbmikny-82glfff.svg')}
                onError={onImgError('mmbmikny-82glfff.svg')}
                className={styles.gridLine5}
              />
            </div>
          </div>
          <div className={styles.instance3}>
            <div className={styles.frame1912056272}>
              <div className={styles.rectangle1322} />
              <p className={styles.a1000}>0:00</p>
            </div>
            <div className={styles.frame1912056272}>
              <div className={styles.rectangle1322} />
              <p className={styles.a1000}>2:00</p>
            </div>
            <div className={styles.frame1912056272}>
              <div className={styles.rectangle1322} />
              <p className={styles.a1000}>4:00</p>
            </div>
            <div className={styles.frame1912056272}>
              <div className={styles.rectangle1322} />
              <p className={styles.a1000}>6:00</p>
            </div>
            <div className={styles.frame1912056272}>
              <div className={styles.rectangle1322} />
              <p className={styles.a1000}>8:00</p>
            </div>
            <div className={styles.frame1912056272}>
              <div className={styles.rectangle1322} />
              <p className={styles.a1000}>10:00</p>
            </div>
            <div className={styles.frame1912056272}>
              <div className={styles.rectangle1322} />
              <p className={styles.a1000}>12:00</p>
            </div>
            <div className={styles.frame1912056272}>
              <div className={styles.rectangle1322} />
              <p className={styles.a1000}>14:00</p>
            </div>
          </div>
        </div>
      </div>
      <div className={styles.frame1912056477}>
        <div className={styles.frame8}>
          <div className={styles.frame7}>
            <div className={styles.rectangle346240934} />
            <div className={styles.rectangleCopy80} />
          </div>
          <p className={styles.legendName}>to.service=logservice.byted.org</p>
        </div>
        <div className={styles.instance6}>
          <div className={styles.instance5}>
            <div className={styles.rectangle346240934} />
            <div className={styles.rectangleCopy802} />
          </div>
          <p className={styles.legendName}>to.service=security.bytedatatag.rpc</p>
        </div>
        <div className={styles.instance7}>
          <div className={styles.frame9}>
            <div className={styles.rectangleCopy803} />
          </div>
          <p className={styles.legendName}>sli-latency-latency</p>
        </div>
        <div className={styles.instance8}>
          <div className={styles.frame10}>
            <div className={styles.rectangleCopy804} />
          </div>
          <p className={styles.legendName}>to.service=toutiao.redis.streamlog</p>
        </div>
        <div className={styles.instance9}>
          <div className={styles.frame11}>
            <div className={styles.rectangleCopy805} />
          </div>
          <p className={styles.legendName}>sli-traffic-throughput</p>
        </div>
        <div className={styles.instance10}>
          <div className={styles.frame12}>
            <div className={styles.rectangleCopy806} />
          </div>
          <p className={styles.legendName}>latency-latency=test</p>
        </div>
      </div>
    </div>
  );
}

export default Component;
