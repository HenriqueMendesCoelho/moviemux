import axios from "axios";

export default {
  async randomNumber() {
    return axios.get(
      "https://www.random.org/integers/?num=1&min=111111&max=999999&col=1&base=10&format=plain&rnd=new"
    );
  },
};
