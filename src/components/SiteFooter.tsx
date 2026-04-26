export function SiteFooter() {
  return (
    <footer className="siteFooter" aria-label="Footer">
      <div className="siteFooterGrid">
        <div>
          <h3>iStore Набережные Челны</h3>
          <p>Набережные Челны, ул. Сююмбике 21/33 (41/04 по комплексу), вход со стороны пр. Беляева</p>
          <p>10:00–20:00 ежедневно</p>
        </div>

        <div>
          <h3>Связь</h3>
          <p>
            <a href="tel:+79870059039">+7 (987) 005-90-39</a>
          </p>
          <p>
            <a href="tel:+79172757445">+7 (917) 275-74-45</a> — сервис
          </p>
          <p>
            <a href="mailto:istore116shop@gmail.com">istore116shop@gmail.com</a>
          </p>
          <p style={{ marginTop: 12 }}>
            <a href="https://t.me/iStore116Bot" target="_blank" rel="noopener">
              Заявки на покупку
            </a>
          </p>
          <p>
            <a href="https://t.me/iStore116/1616" target="_blank" rel="noopener">
              Розыгрыш призов
            </a>
          </p>

          <div className="siteSocialIcons" aria-label="Соцсети">
            <a className="siteSocialBtn" href="https://t.me/iStore116" target="_blank" rel="noopener" aria-label="Telegram канал">
              <svg className="siteSocialIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M21.8 4.5c.3-1.4-1-2.1-2.2-1.7L2.9 9.2c-1.5.6-1.5 2.7.1 3.1l4.6 1.3 1.7 5.3c.4 1.3 2.1 1.6 3 .6l2.6-2.6 4.7 3.4c1 .7 2.3.2 2.5-1.1L21.8 4.5Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path d="M8 13.5 18.8 6.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </a>

            <a className="siteSocialBtn" href="https://max.ru/iStore116" target="_blank" rel="noopener" aria-label="MAX канал">
              <svg className="siteSocialIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4.5 18.5V5.5h3.8l3.7 6.2 3.7-6.2h3.8v13h-3.3V11l-3 5h-2.4l-3-5v7.5H4.5Z" fill="currentColor" />
              </svg>
            </a>

            <a
              className="siteSocialBtn"
              href="https://www.instagram.com/istore_shop116?igsh=YnpsNmkzYzduNmp6&utm_source=qr"
              target="_blank"
              rel="noopener"
              aria-label="Instagram"
            >
              <svg className="siteSocialIcon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M7.5 3.8h9A3.7 3.7 0 0 1 20.2 7.5v9a3.7 3.7 0 0 1-3.7 3.7h-9A3.7 3.7 0 0 1 3.8 16.5v-9A3.7 3.7 0 0 1 7.5 3.8Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path d="M12 16.2a4.2 4.2 0 1 0 0-8.4 4.2 4.2 0 0 0 0 8.4Z" stroke="currentColor" strokeWidth="1.7" />
                <path d="M17.2 6.9h.01" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
              </svg>
            </a>
          </div>
        </div>

        <div>
          <h3>Разделы</h3>
          <p>
            <a href="/">Главная</a>
          </p>
          <p>
            <a href="/catalog/">Каталог</a>
          </p>
          <p>
            <a
              href="https://2gis.ru/nabchelny/firm/70000001065465431/tab/reviews?m=52.394279%2C55.739588%2F16.38"
              target="_blank"
              rel="noopener"
            >
              Отзывы в 2GIS
            </a>
          </p>
        </div>
      </div>

      <div className="siteFooterCopy">© iStore Набережные Челны. Все товарные знаки принадлежат их правообладателям.</div>
    </footer>
  );
}

