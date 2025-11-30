import app from "./index.js";
import { retroProfile } from "./services/retro.js";

const PORT = process.env.PORT || 3000;
const profile = await retroProfile("YobbiesHobbies");
// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Profile: ${JSON.stringify(profile)}`);
});