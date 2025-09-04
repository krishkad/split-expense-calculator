import Link from "next/link";
import React from "react";

const Navbar = () => {
  return (
    <div className="w-full sticky top-0 bg-white">
      <div className="max-w-4xl mx-auto px-6 sm:px-2 h-16 flex items-center justify-between">
        <div className="">
          <Link href={"/"}>
            <h2 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              IOU LOL
            </h2>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-6">
          <Link
            href={"/blogs"}
            className="hover:text-primary transition-colors"
          >
            Blogs
          </Link>
          <Link
            href={"/Contact"}
            className="hover:text-primary transition-colors"
          >
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
