export default {
  async checkImageSizeByUrl(
    url: string,
    minHeight = 650,
    maxHeight = 800,
    minWidth = 500,
    maxWidth = 500,
  ) {
    const image = new Image();
    return new Promise<{ imgOk: boolean; error: boolean }>(function (resolve, reject) {
      if (!/\.(jpg|jpeg|png|webp|)$/.test(url)) {
        reject(Error(`Invalid image URL: ${url}`));
      }

      image.addEventListener('load', function () {
        if (!this.naturalHeight || !this.naturalWidth) {
          resolve({ imgOk: false, error: false });
        }

        if (
          this.naturalHeight < minHeight ||
          this.naturalHeight > maxHeight ||
          this.naturalWidth > maxWidth ||
          this.naturalWidth < minWidth
        ) {
          resolve({ imgOk: false, error: false });
        }

        resolve({ imgOk: true, error: false });
      });

      image.addEventListener('error', function () {
        reject(Error(`Invalid image URL: ${url}`));
      });

      image.src = url;
    });
  },
};
