import axios from "axios";
import { useEffect } from "react";
import { useRouter } from "next/router";

const Logout = () => {
  const router = useRouter();

  useEffect(() => {
    const logoutUser = async () => {
      const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/users/logout/`; // Correct logout endpoint
      await axios.post(backendUrl, {}, { withCredentials: true });
      router.push("/login"); // Redirect to login page after logout
    };
    logoutUser();
  }, [router]);

  return <p>Logging out...</p>;
};

export default Logout;
