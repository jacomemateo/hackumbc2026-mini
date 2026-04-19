import { CssBaseline, ThemeProvider } from "@mui/material";
import Template from "@components/Template";
import theme from "./theme";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Template />
    </ThemeProvider>
  );
}

export default App;
