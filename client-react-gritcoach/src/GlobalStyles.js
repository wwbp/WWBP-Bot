import { GlobalStyles as MUIGlobalStyles } from "@mui/system";

const GlobalStyles = () => (
  <MUIGlobalStyles
    styles={{
      "@font-face": [
        {
          fontFamily: "NeutraText",
          src: 'url(assets/fonts/Neutra-Text-Demi.ttf) format("truetype")',
          fontWeight: 600,
          fontStyle: "normal",
        },
        {
          fontFamily: "NeutraText",
          src: 'url(assets/fonts/Neutra-Text-Light.ttf) format("truetype")',
          fontWeight: 300,
          fontStyle: "normal",
        },
        {
          fontFamily: "NeutraText",
          src: 'url(assets/fonts/Neutra-Text-TF.ttf) format("truetype")',
          fontWeight: 400,
          fontStyle: "normal",
        },
        {
          fontFamily: "NeutraText",
          src: 'url(assets/fonts/NeutraText-Bold.otf) format("opentype")',
          fontWeight: "bold",
          fontStyle: "normal",
        },
        {
          fontFamily: "NeutraText",
          src: 'url(assets/fonts/NeutraText-BoldItalic.otf) format("opentype")',
          fontWeight: "bold",
          fontStyle: "italic",
        },
        {
          fontFamily: "NeutraText",
          src: 'url(assets/fonts/NeutraText-Book.otf) format("opentype")',
          fontWeight: 400,
          fontStyle: "normal",
        },
        {
          fontFamily: "NeutraText",
          src: 'url(assets/fonts/NeutraText-BookItalic.otf) format("opentype")',
          fontWeight: 400,
          fontStyle: "italic",
        },
      ],
      body: {
        fontFamily: "NeutraText",
      },
      "*": {
        margin: 0,
        padding: 0,
        boxSizing: "border-box",
      },
    }}
  />
);

export default GlobalStyles;
