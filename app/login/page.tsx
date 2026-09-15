"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/store/auth";
import { toast } from "sonner";
import { EyeOff, Eye, QrCode } from "lucide-react";
import "@/app/dashboard.css";

interface LoginForm {
  email: string;
  password: string;
}

interface SetupForm {
  password: string;
  confirmPassword: string;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, isAuthenticated, _hasHydrated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [setupToken, setSetupToken] = useState("");
  const [hashReturnUrl, setHashReturnUrl] = useState("");

  const queryReturnUrl = searchParams.get("returnUrl") || "/";
  const returnUrl = hashReturnUrl || queryReturnUrl;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const {
    register: registerSetup,
    handleSubmit: handleSubmitSetup,
    watch,
    formState: { errors: setupErrors },
  } = useForm<SetupForm>();

  const setupPasswordValue = watch("password");

  const applySession = async (accessToken: string, user?: any) => {
    if (user?.branchId) {
      const profile = await authApi.getProfile(accessToken, user.branchId);
      setAuth(profile, accessToken);
      return;
    }
    if (user) {
      setAuth(user, accessToken);
      return;
    }
    const profile = await authApi.getProfile(accessToken);
    if (profile.branchId) {
      const withBranch = await authApi.getProfile(accessToken, profile.branchId);
      setAuth(withBranch, accessToken);
      return;
    }
    setAuth(profile, accessToken);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    if (!raw) return;

    const params = new URLSearchParams(raw);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );

    const error = params.get("lark_error");
    const setup = params.get("lark_setup");
    const token = params.get("lark_token");
    const nextReturn = params.get("return_to");
    if (nextReturn) setHashReturnUrl(nextReturn);
    if (error) {
      setAuthError(error);
      return;
    }
    if (setup) {
      setSetupToken(setup);
      return;
    }
    if (token) {
      setIsLoading(true);
      applySession(token)
        .then(() => {
          toast.success("Đăng nhập thành công!");
          router.replace(nextReturn || queryReturnUrl);
        })
        .catch((err: any) => {
          setAuthError(err.message || "Đăng nhập Lark thất bại");
        })
        .finally(() => setIsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (_hasHydrated && isAuthenticated && !setupToken) {
      router.replace(returnUrl);
    }
  }, [isAuthenticated, _hasHydrated, router, returnUrl, setupToken]);

  useEffect(() => {
    const error = sessionStorage.getItem("auth-error");
    if (error) {
      setAuthError(error);
      sessionStorage.removeItem("auth-error");
    }
  }, []);

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await authApi.login(data);
      await applySession(response.accessToken, response.user);
      toast.success("Đăng nhập thành công!");
      router.replace(returnUrl);
    } catch (error: any) {
      toast.error(error.message || "Đăng nhập thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const onSetupSubmit = async (data: SetupForm) => {
    setIsLoading(true);
    try {
      const response = await authApi.setupLarkPassword({
        setupToken,
        password: data.password,
        confirmPassword: data.confirmPassword,
      });
      await applySession(response.accessToken, response.user);
      toast.success("Đã tạo mật khẩu, đăng nhập thành công!");
      router.replace(returnUrl);
    } catch (error: any) {
      toast.error(error.message || "Không thể tạo mật khẩu");
    } finally {
      setIsLoading(false);
    }
  };

  const startLarkLogin = () => {
    if (!process.env.NEXT_PUBLIC_API_URL) {
      toast.error("Chưa cấu hình API");
      return;
    }
    window.location.href = authApi.larkLoginUrl(returnUrl);
  };

  if (!_hasHydrated) {
    return (
      <div className="dt-dash flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="dt-dash min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">
            {setupToken ? "Tạo mật khẩu" : "Đăng nhập"}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {setupToken
              ? "Đặt mật khẩu để đăng nhập bằng email khi không quét được QR"
              : "Hệ thống quản lý bán hàng HiSweetie"}
          </p>
        </div>

        {authError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {authError}
          </div>
        )}

        {setupToken ? (
          <form
            className="mt-8 space-y-6"
            onSubmit={handleSubmitSetup(onSetupSubmit)}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mật khẩu mới
                </label>
                <div className="relative mt-1">
                  <input
                    {...registerSetup("password", {
                      required: "Mật khẩu là bắt buộc",
                      minLength: {
                        value: 8,
                        message: "Mật khẩu phải có ít nhất 8 ký tự",
                      },
                    })}
                    type={showPassword ? "text" : "password"}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand focus:border-brand"
                    placeholder="Ít nhất 8 ký tự"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {setupErrors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {setupErrors.password.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Xác nhận mật khẩu
                </label>
                <div className="relative mt-1">
                  <input
                    {...registerSetup("confirmPassword", {
                      required: "Vui lòng nhập lại mật khẩu",
                      validate: (value) =>
                        value === setupPasswordValue ||
                        "Mật khẩu xác nhận không khớp",
                    })}
                    type={showConfirmPassword ? "text" : "password"}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand focus:border-brand"
                    placeholder="Nhập lại mật khẩu"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {setupErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {setupErrors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? "Đang lưu..." : "Lưu mật khẩu và đăng nhập"}
            </button>
          </form>
        ) : (
          <>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    {...register("email", {
                      required: "Email là bắt buộc",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Email không hợp lệ",
                      },
                    })}
                    type="email"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand focus:border-brand"
                    placeholder="email@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700">
                    Mật khẩu
                  </label>
                  <div className="relative mt-1">
                    <input
                      {...register("password", {
                        required: "Mật khẩu là bắt buộc",
                      })}
                      type={showPassword ? "text" : "password"}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand focus:border-brand"
                      placeholder="Nhập mật khẩu"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">hoặc</span>
              </div>
            </div>

            <button
              type="button"
              onClick={startLarkLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-800 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed">
              <QrCode className="w-4 h-4" />
              Đăng nhập bằng Lark
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
