import Link from "next/link";
import React from "react";

const Navbar = () => {
  return (
    <div className="w-full sticky top-0 bg-white">
      <div className="max-w-4xl mx-auto px-6 sm:px-2 h-16 flex items-center justify-between">
        <div className="">
          <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Exspi
          </h2>
        </div>

        <div className="flex items-center justify-center gap-6">
            <Link href={"/"}>Home</Link>
            <Link href={"/blogs"}>Blogs</Link>
            <Link href={"/Contact"}>Contact</Link>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
