"use client";
import Link from "next/link";

export default function Navbar() {
    return (
        <nav className="backdrop-blur-2xl mx-auto fixed top-0 w-full mx-auto z-50 px-40">

            <div className="flex items-center justify-between mx-auto px-2 py-1">
                <div className="flex flex-row justify-center items-center gap-6">
                    <ul className="flex flex-row space-x-2 rtl:space-x-reverse">
                        <li className="">
                            <Link href="/" className={`group text-xl bg-white 
                                text-transparent bg-clip-text group block px-5 py-2 font-bold`}>
                                    Teknikly
                            </Link>
                        </li>
                    </ul>
                </div>

                <div className="flex flex-row justify-center items-center gap-6 absolute left-1/2 transform -translate-x-1/2">
                    <ul className="font-medium flex flex-row space-x-2 rtl:space-x-reverse">
                        <li className="">
                            <div className="group rounded-lg">
                                <Link href="/" className={`
                                    group block px-3 py-2 
                                    text-white text-md
                                    group-hover:text-emerald-500 transition duration-200
                                `}> 
                                    Problems 
                                </Link>
                            </div>
                        </li>
                    </ul>
                    <ul className="font-medium flex flex-row space-x-2 rtl:space-x-reverse">
                        <li className="">
                            <div className="group rounded-lg">
                                <Link href="/" className={`
                                    group block px-3 py-2 
                                    text-white text-md
                                    group-hover:text-emerald-500 transition duration-200
                                `}> Assessments </Link>
                            </div>
                        </li>
                    </ul>
                    <ul className="font-medium flex flex-row space-x-2 rtl:space-x-reverse">
                        <li className="">
                            <div className="group rounded-lg">
                                <Link href="/" className={`
                                    group block px-3 py-2 
                                    text-white text-md
                                    group-hover:text-emerald-500 transition duration-200
                                `}> Pricing </Link>
                            </div>
                        </li>
                    </ul>
                </div>

                <div className="flex flex-row justify-center items-center gap-3">
                    <ul className="font-medium flex flex-row space-x-2 rtl:space-x-reverse">
                        <li className="">
                            <div className="group">
                                <Link href="/signup" className={`
                                    group block px-3 py-2 
                                    text-white text-md
                                    group-hover:text-emerald-500 transition duration-200
                                `}> Sign up </Link>
                            </div>
                        </li>
                    </ul>
                    <ul className="font-medium flex flex-row space-x-2 rtl:space-x-reverse">
                        <li className="">
                            <div className="group">
                                <Link href="/login" className={`
                                    group block px-3 py-2 
                                    text-white text-md
                                    group-hover:text-emerald-500 transition duration-200
                                `}> Log in </Link>
                            </div>
                        </li>
                    </ul>
                </div>

            </div>

        </nav>
    )
}

