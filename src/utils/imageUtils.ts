export default {
  async checkImageSizeByUrl(url: string) {
    const image = new Image();
    return new Promise<{ imgOk: boolean; error: boolean }>(function (resolve, reject) {
      image.addEventListener('load', function () {
        if (!this.naturalHeight || !this.naturalWidth) {
          resolve({ imgOk: false, error: false });
        }

        if (
          this.naturalHeight < 350 ||
          this.naturalHeight > 1200 ||
          this.naturalWidth > 1100 ||
          this.naturalWidth < 550
        ) {
          resolve({ imgOk: false, error: false });
        }

        resolve({ imgOk: true, error: false });
      });

      image.addEventListener('error', function () {
        reject({ error: true });
      });

      image.src = url;
    });
  },
};
