import withNextra from 'nextra'

export default withNextra({
  theme: 'nextra-theme-docs',
  themeConfig: './theme.config.tsx'
})({
  reactStrictMode: true,
  output: "export",
  images: {
    unoptimized: true,
  },
})
