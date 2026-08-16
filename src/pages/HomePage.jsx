import { useState } from "react";

import SearchComp from "../components/SearchComp/SearchComp";

import Footer from "../components/Footer/Footer";
import Header from "../components/Header/Header";
import GoToTop from "../components/UI/GoToTop";
import ToastComp from "../components/UI/Toast/Toast";

export default function HomePage() {
  return (
    <div>
      <ToastComp />
      <Header />

      <div>
        <div>
          <SearchComp />
          <GoToTop />
          <Footer />
        </div>
      </div>
    </div>
  );
}
