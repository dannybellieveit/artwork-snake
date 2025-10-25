# Artwork Snake

A small snake game that uses images for the snake body. Open `index.html` in your browser to play.

## Testing the drop page

- Start a local server: `npx serve public`
- Visit `http://localhost:5000/drop/<token>` replacing `<token>` with a real Nextcloud share token.
- Run `curl -I http://localhost:5000/drop/<token>` to confirm the redirect to `drop.html` works.
- In browser DevTools, check the Network tab and console for errors to verify the iframe loads the Nextcloud UI.
