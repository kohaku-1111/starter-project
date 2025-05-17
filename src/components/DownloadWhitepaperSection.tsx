import React from 'react';

const DownloadWhitepaperSection: React.FC = () => (
  <section className="download-whitepaper-section">
    <h2>Download our whitepaper</h2>
    <p>Fill in your email to get the latest insights.</p>
    <div id="mc_embed_signup">
      <form action="https://example.us1.list-manage.com/subscribe/post?u=xxxxxxxxx&id=yyyyyyyyy" method="post" id="mc-embedded-subscribe-form" name="mc-embedded-subscribe-form" className="validate" target="_blank" noValidate>
        <div id="mc_embed_signup_scroll">
          <input type="email" name="EMAIL" className="email" id="mce-EMAIL" placeholder="email address" required />
          <div style={{ position: 'absolute', left: '-5000px' }} aria-hidden="true">
            <input type="text" name="b_xxxxxxxxx_yyyyyyyyy" tabIndex={-1} defaultValue="" />
          </div>
          <div className="clear">
            <input type="submit" value="Download" name="subscribe" id="mc-embedded-subscribe" className="button" />
          </div>
        </div>
      </form>
    </div>
  </section>
);

export default DownloadWhitepaperSection;
