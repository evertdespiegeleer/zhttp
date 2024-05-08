import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'

const config: DocsThemeConfig = {
  logo: <span>zhttp</span>,
  project: {
    link: 'https://github.com/evertdespiegeleer/zhttp',
  },
  docsRepositoryBase: 'https://github.com/evertdespiegeleer/zhttp/docs',
  feedback: {
    useLink: () => 'https://github.com/evertdespiegeleer/zhttp/issues',
  },
  editLink: {
    text: 'Edit this page on GitHub →',
  },
  footer: {
    text: <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.8em'
    }}>
      <p>zhttp built with ❤️ by <a href="https://evertdespiegeleer.com">Evert De Spiegeleer</a></p>
      <p>Docs generated with <a href="nextra.site">Nextra</a></p>
    </div>
  },
  toc: {
    backToTop: true
  }
}

export default config
