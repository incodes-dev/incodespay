export const loadScript = (src: string) => {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${src}"]`
    );

    if (existing) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");

    script.src = src;

    script.async = true;

    script.onload = () => resolve(true);

    script.onerror = () => reject(false);

    document.body.appendChild(script);
  });
};