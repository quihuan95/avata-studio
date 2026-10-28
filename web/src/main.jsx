import React, { useState, useEffect, useRef, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Upload,
  Download,
  RotateCcw,
  Share2,
  ImagePlus,
  LayoutDashboard,
  Plus,
  Pencil,
  Trash2,
  X,
  ArrowLeft,
  ExternalLink,
  Check,
  Link as LinkIcon,
  Camera,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import "./style.css";
import hbgLogo from "../Logo-vàng-đồng.png";
const API = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const localSeed = [
  {
    id: 1,
    slug: "hbg-customer-conference-2026",
    name: "Hội nghị khách hàng The HBG 2026",
    subtitle: "Chất lượng tạo danh tiếng",
    frame_url: "/frames/welcome.svg",
    active: true,
    views: 0,
    downloads: 0,
  },
  {
    id: 2,
    slug: "anniversary",
    name: "Kỷ niệm thành lập",
    subtitle: "Tự hào hành trình kết nối",
    frame_url: "/frames/anniversary.svg",
    active: true,
    views: 0,
    downloads: 0,
  },
];
const getLocal = () => {
  try {
    return JSON.parse(localStorage.getItem("afs_campaigns")) || localSeed;
  } catch {
    return localSeed;
  }
};
const storeLocal = (a) =>
  localStorage.setItem("afs_campaigns", JSON.stringify(a));
async function request(path, opts) {
  if (!API) throw Error("local");
  const r = await fetch(API + path, {
    headers: {
      Accept: "application/json",
      ...(opts?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(opts?.headers || {}),
    },
    ...opts,
  });
  if (!r.ok) throw Error((await r.text()).slice(0, 200));
  return r.json();
}
const canvasSize = 1080;
const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/.test(url)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(Error("Không tải được ảnh; hãy thử ảnh khác hoặc cùng tên miền."));
    img.src = url;
  });
function App() {
  const [campaigns, setCampaigns] = useState(getLocal);
  const [backend, setBackend] = useState(false);
  const [selected, setSelected] = useState(null);
  const [admin, setAdmin] = useState(
    location.pathname === "/admin" || location.hash.startsWith("#/admin"),
  );
  const [userImage, setUserImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [angle, setAngle] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [adminAccessToken, setAdminAccessToken] = useState(
    localStorage.getItem("afs_admin_token") || "",
  );
  const [adminCredentials, setAdminCredentials] = useState({
    username: "admin",
    password: "",
  });
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [form, setForm] = useState({
    name: "",
    subtitle: "",
    slug: "",
    frame_url: "",
  });
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [frameFile, setFrameFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const canvas = useRef(null),
    input = useRef(null),
    frameInput = useRef(null),
    pointer = useRef(null),
    imageUrl = useRef(null);
  const notify = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 4200);
  };
  useEffect(() => {
    let stop = false;
    request("/campaigns")
      .then((d) => {
        if (!stop) {
          setCampaigns(d.data || d);
          setBackend(true);
        }
      })
      .catch(() => {});
    return () => {
      stop = true;
    };
  }, []);
  useEffect(() => {
    if (!adminAccessToken || !API) return;
    request("/admin/check", {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    })
      .then(() => setAdminAuthenticated(true))
      .catch(() => {
        localStorage.removeItem("afs_admin_token");
        setAdminAccessToken("");
        setAdminAuthenticated(false);
      });
  }, []);
  useEffect(() => {
    if (location.hash.startsWith("#/admin"))
      history.replaceState({}, "", "/admin");
    const sync = () => {
      const isAdmin = location.pathname === "/admin";
      setAdmin(isAdmin);
      if (isAdmin) setSelected(null);
    };
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    sync();
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);
  useEffect(() => {
    const match = location.pathname.match(/^\/c\/([^/]+)\/?$/);
    if (!match) return;
    const slug = decodeURIComponent(match[1]);
    const c = campaigns.find((x) => x.slug === slug);
    if (c) setSelected(c);
  }, [campaigns]);
  useEffect(() => {
    if (!userImage || !selected) return;
    let killed = false;
    const paint = async () => {
      try {
        const [photo, frame] = await Promise.all([
          loadImage(userImage),
          loadImage(selected.frame_url),
        ]);
        if (killed) return;
        const ctx = canvas.current.getContext("2d");
        canvas.current.width = canvasSize;
        canvas.current.height = canvasSize;
        ctx.clearRect(0, 0, canvasSize, canvasSize);
        ctx.fillStyle = "#f5f7fc";
        ctx.fillRect(0, 0, canvasSize, canvasSize);
        const fit = Math.max(
          canvasSize / photo.width,
          canvasSize / photo.height,
        );
        const w = photo.width * fit * scale,
          h = photo.height * fit * scale;
        ctx.save();
        ctx.translate(canvasSize / 2 + offset.x, canvasSize / 2 + offset.y);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(photo, -w / 2, -h / 2, w, h);
        ctx.restore();
        ctx.drawImage(frame, 0, 0, canvasSize, canvasSize);
      } catch (e) {
        notify(e.message);
      }
    };
    paint();
    return () => {
      killed = true;
    };
  }, [userImage, selected, scale, offset, angle]);
  const chooseCampaign = (c) => {
    setSelected(c);
    setUserImage(null);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setAngle(0);
    history.pushState({}, "", `/c/${c.slug}`);
    if (backend)
      request(`/campaigns/${encodeURIComponent(c.slug)}/view`, {
        method: "POST",
      }).catch(() => {});
  };
  const selectPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return notify("Chỉ nhận tệp hình ảnh");
    if (f.size > 15 * 1024 * 1024) return notify("Ảnh tối đa 15 MB");
    if (imageUrl.current) URL.revokeObjectURL(imageUrl.current);
    imageUrl.current = URL.createObjectURL(f);
    setUserImage(imageUrl.current);
    setOffset({ x: 0, y: 0 });
    setScale(1);
    setAngle(0);
  };
  const download = () => {
    if (!userImage) return notify("Hãy tải ảnh cá nhân lên trước");
    const a = document.createElement("a");
    a.href = canvas.current.toDataURL("image/png");
    a.download = `avatar-${selected.slug}.png`;
    a.click();
    if (backend)
      request(`/campaigns/${encodeURIComponent(selected.slug)}/download`, {
        method: "POST",
      }).catch(() => {});
    else {
      setCampaigns((prev) => {
        const next = prev.map((x) =>
          x.id === selected.id
            ? { ...x, downloads: (x.downloads || 0) + 1 }
            : x,
        );
        storeLocal(next);
        return next;
      });
    }
    notify("Đã tạo ảnh PNG 1080 × 1080. Hãy đặt làm ảnh đại diện nhé!");
  };
  const share = async () => {
    const url = location.origin + `/c/${selected.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: selected.name, url });
      else {
        await navigator.clipboard.writeText(url);
        notify("Đã sao chép link chiến dịch");
      }
    } catch (e) {
      if (e.name !== "AbortError") notify("Không chia sẻ được");
    }
  };
  const openNew = () => {
    setSelected(null);
    setUserImage(null);
    history.pushState({}, "", "/");
  };
  const resetCampaignForm = () => {
    setForm({ name: "", subtitle: "", slug: "", frame_url: "" });
    setFrameFile(null);
    setEditingCampaign(null);
    if (frameInput.current) frameInput.current.value = "";
  };
  const editCampaign = (campaign) => {
    setEditingCampaign(campaign);
    setForm({
      name: campaign.name || "",
      subtitle: campaign.subtitle || "",
      slug: campaign.slug || "",
      frame_url: campaign.frame_url || "",
    });
    setFrameFile(null);
    if (frameInput.current) frameInput.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const submitCampaign = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return notify("Nhập tên chiến dịch");
    if (!editingCampaign && !frameFile && !form.frame_url)
      return notify("Hãy chọn file PNG hoặc SVG làm khung");
    try {
      setBusy(true);
      let frame_url = form.frame_url;
      if (backend) {
        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("subtitle", form.subtitle);
        fd.append(
          "slug",
          form.slug ||
            form.name
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/đ/g, "d")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, ""),
        );
        if (frameFile) fd.append("frame", frameFile);
        else if (!editingCampaign) fd.append("frame_url", frame_url);
        const data = await request(
          editingCampaign
            ? `/admin/campaigns/${editingCampaign.id}`
            : "/admin/campaigns",
          {
          method: "POST",
          headers: { Authorization: `Bearer ${adminAccessToken}` },
          body: fd,
          },
        );
        const saved = data.data || data;
        setCampaigns((current) =>
          editingCampaign
            ? current.map((campaign) =>
                campaign.id === editingCampaign.id ? saved : campaign,
              )
            : [saved, ...current],
        );
      } else {
        if (frameFile) {
          frame_url = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = reject;
            fr.readAsDataURL(frameFile);
          });
        }
        const c = {
          ...form,
          frame_url,
          slug: form.slug || "campaign-" + Date.now(),
          id: editingCampaign?.id || Date.now(),
          active: true,
          views: editingCampaign?.views || 0,
          downloads: editingCampaign?.downloads || 0,
        };
        setCampaigns((prev) => {
          const n = editingCampaign
            ? prev.map((campaign) =>
                campaign.id === editingCampaign.id ? c : campaign,
              )
            : [c, ...prev];
          try {
            storeLocal(n);
          } catch {
            notify("File quá lớn để lưu demo, hãy cấu hình Laravel API");
          }
          return n;
        });
      }
      const wasEditing = Boolean(editingCampaign);
      resetCampaignForm();
      notify(wasEditing ? "Đã cập nhật chiến dịch" : "Đã tạo chiến dịch");
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (c) => {
    if (!confirm("Xóa chiến dịch " + c.name + "?")) return;
    try {
      if (backend)
        await request(`/admin/campaigns/${c.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${adminAccessToken}` },
        });
      setCampaigns((prev) => {
        const n = prev.filter((x) => x.id !== c.id);
        if (!backend) storeLocal(n);
        return n;
      });
      if (editingCampaign?.id === c.id) resetCampaignForm();
      notify("Đã xóa");
    } catch (e) {
      notify(e.message);
    }
  };
  const loginAdmin = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!API) {
      setLoginError(
        "Chưa cấu hình Laravel API nên không thể xác thực quản trị.",
      );
      return;
    }
    try {
      setBusy(true);
      const data = await request("/admin/login", {
        method: "POST",
        body: JSON.stringify(adminCredentials),
      });
      localStorage.setItem("afs_admin_token", data.access_token);
      setAdminAccessToken(data.access_token);
      setAdminCredentials((current) => ({ ...current, password: "" }));
      setAdminAuthenticated(true);
    } catch {
      setLoginError("Thông tin đăng nhập không đúng.");
    } finally {
      setBusy(false);
    }
  };
  const logoutAdmin = () => {
    localStorage.removeItem("afs_admin_token");
    setAdminAccessToken("");
    setAdminAuthenticated(false);
    history.pushState({}, "", "/");
    setAdmin(false);
  };
  return (
    <div className="app">
      <header>
        <div className="header-inner">
          <button
            className="brand"
            onClick={() => {
              setAdmin(false);
              openNew();
            }}
          >
            <img
              className="brand-logo"
              src={hbgLogo}
              alt="The HBG – The HoaBinh Group"
            />
          </button>
          <nav>
            <button
              className={!admin ? "nav-active" : ""}
              onClick={() => {
                setAdmin(false);
                openNew();
              }}
            >
              Khám phá
            </button>
          </nav>
        </div>
      </header>
      {admin ? (
        !adminAuthenticated ? (
          <main className="container admin admin-login">
            <form className="panel login-panel" onSubmit={loginAdmin}>
              <div className="login-icon">
                <LayoutDashboard size={28} />
              </div>
              <div className="eyebrow">ADMIN ACCESS</div>
              <h1>Đăng nhập quản trị</h1>
              <p className="description">
                Đăng nhập để tiếp tục vào khu vực quản lý chiến dịch.
              </p>
              <label>
                Tài khoản
                <input
                  autoFocus
                  type="text"
                  value={adminCredentials.username}
                  onChange={(e) =>
                    setAdminCredentials({
                      ...adminCredentials,
                      username: e.target.value,
                    })
                  }
                  placeholder="Tên đăng nhập"
                  autoComplete="username"
                />
              </label>
              <label>
                Mật khẩu
                <input
                  type="password"
                  value={adminCredentials.password}
                  onChange={(e) =>
                    setAdminCredentials({
                      ...adminCredentials,
                      password: e.target.value,
                    })
                  }
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                />
              </label>
              {loginError && <p className="login-error">{loginError}</p>}
              <button
                disabled={
                  busy ||
                  !adminCredentials.username ||
                  !adminCredentials.password
                }
                className="primary full"
                type="submit"
              >
                {busy ? "Đang xác thực..." : "Đăng nhập"}
              </button>
            </form>
          </main>
        ) : (
          <main className="container admin">
            <div className="eyebrow">DASHBOARD / CAMPAIGN MANAGER</div>
            <div className="section-header">
              <div>
                <h1>Quản lý chiến dịch</h1>
                <p>Tạo và phân phối khung avatar cho mọi sự kiện.</p>
              </div>
              <button className="secondary" onClick={logoutAdmin}>
                Đăng xuất
              </button>
            </div>
            <div className="admin-grid">
              <form className="panel form-panel" onSubmit={submitCampaign}>
                <h2>
                  {editingCampaign ? <Pencil size={20} /> : <Plus size={20} />}
                  {editingCampaign ? "Chỉnh sửa chiến dịch" : "Tạo chiến dịch"}
                </h2>
                <label>
                  Tên sự kiện
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Hội nghị khách hàng The HBG 2026"
                  />
                </label>
                <label>
                  Mô tả ngắn
                  <input
                    value={form.subtitle}
                    onChange={(e) =>
                      setForm({ ...form, subtitle: e.target.value })
                    }
                    placeholder="Chất lượng tạo danh tiếng"
                  />
                </label>
                <label>
                  Slug đường dẫn
                  <input
                    value={form.slug}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, ""),
                      })
                    }
                    placeholder="hbg-customer-conference-2026"
                  />
                </label>
                <label>
                  Khung PNG trong suốt / SVG
                  <input
                    ref={frameInput}
                    type="file"
                    accept="image/png,image/svg+xml"
                    onChange={(e) => setFrameFile(e.target.files?.[0] || null)}
                  />
                </label>
                <div className="muted small">
                  {editingCampaign
                    ? "Để trống nếu muốn giữ nguyên khung hiện tại."
                    : "Ưu tiên ảnh 1080 × 1080 px. Phần giữa khung cần trong suốt."}
                </div>
                <button disabled={busy} className="primary full" type="submit">
                  {editingCampaign ? <Pencil size={18} /> : <Plus size={18} />}
                  {busy
                    ? "Đang lưu..."
                    : editingCampaign
                      ? "Lưu thay đổi"
                      : "Tạo chiến dịch"}
                </button>
                {editingCampaign && (
                  <button
                    disabled={busy}
                    className="secondary full"
                    type="button"
                    onClick={resetCampaignForm}
                  >
                    <X size={18} /> Hủy chỉnh sửa
                  </button>
                )}
              </form>
              <div className="panel">
                <h2>
                  Danh sách chiến dịch{" "}
                  <span className="count">{campaigns.length}</span>
                </h2>
                <div className="campaign-list">
                  {campaigns.map((c) => (
                    <div className="campaign-row" key={c.id}>
                      <div className="thumb">
                        <img src={c.frame_url} alt="" />
                      </div>
                      <div className="row-desc">
                        <strong>{c.name}</strong>
                        <small>
                          /c/{c.slug} · {c.downloads || 0} lượt tải
                        </small>
                      </div>
                      <button title="Chỉnh sửa" onClick={() => editCampaign(c)}>
                        <Pencil size={17} />
                      </button>
                      <button
                        title="Xem"
                        onClick={() => {
                          logoutAdmin();
                          chooseCampaign(c);
                        }}
                      >
                        <ExternalLink size={17} />
                      </button>
                      <button title="Xóa" onClick={() => remove(c)}>
                        <Trash2 size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        )
      ) : selected ? (
        <main className="container editor-page">
          <button className="back" onClick={openNew}>
            <ArrowLeft size={16} /> Tất cả chiến dịch
          </button>
          <div className="editor-heading">
            <div>
              <div className="eyebrow">AVATAR CREATOR</div>
              <h1>{selected.name}</h1>
              <p>{selected.subtitle || "Cùng lan tỏa tinh thần sự kiện"}</p>
            </div>
            <button onClick={share} className="secondary">
              <Share2 size={18} /> Chia sẻ sự kiện
            </button>
          </div>
          <div className="editor-grid">
            <section className="preview-panel">
              <div className="preview-head">
                <span>
                  <Camera size={17} /> Xem trước avatar
                </span>
                <span>1080 × 1080 PNG</span>
              </div>
              <div className="preview">
                {userImage ? (
                  <canvas
                    ref={canvas}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      pointer.current = { x: e.clientX, y: e.clientY, offset };
                    }}
                    onPointerMove={(e) => {
                      if (!pointer.current) return;
                      const r = e.currentTarget.getBoundingClientRect();
                      setOffset({
                        x:
                          pointer.current.offset.x +
                          ((e.clientX - pointer.current.x) * canvasSize) /
                            r.width,
                        y:
                          pointer.current.offset.y +
                          ((e.clientY - pointer.current.y) * canvasSize) /
                            r.height,
                      });
                    }}
                    onPointerUp={() => (pointer.current = null)}
                    onPointerCancel={() => (pointer.current = null)}
                  />
                ) : (
                  <div className="placeholder">
                    <img src={selected.frame_url} alt="Khung sự kiện" />
                    <div className="placeholder-overlay">
                      <div className="camera-circle">
                        <Camera size={26} />
                      </div>
                      <strong>Ảnh của bạn sẽ hiển thị ở đây</strong>
                      <small>Tải ảnh lên để bắt đầu tạo dấu ấn riêng</small>
                    </div>
                  </div>
                )}
              </div>
              <div className="hint">
                {userImage
                  ? "Kéo trực tiếp trên ảnh để điều chỉnh vị trí khuôn mặt"
                  : "Ảnh của bạn được xử lý ngay trên thiết bị, không cần tải lên máy chủ."}
              </div>
            </section>
            <aside className="controls panel">
              <div className="step">
                BƯỚC 01 <span>— CHỌN ẢNH</span>
              </div>
              <h2>Biến khung hình thành dấu ấn của bạn.</h2>
              <p className="description">
                Tải lên một bức ảnh yêu thích để ghép vào khung của chiến dịch.
              </p>
              <button className="upload" onClick={() => input.current?.click()}>
                <ImagePlus size={24} />
                <span>
                  <strong>
                    {userImage ? "Thay ảnh khác" : "Tải ảnh cá nhân lên"}
                  </strong>
                  <small>JPG, PNG, WebP · Tối đa 15MB</small>
                </span>
                <Upload size={19} />
              </button>
              <input
                ref={input}
                hidden
                type="file"
                accept="image/*"
                onChange={selectPhoto}
              />
              <div className="step">
                BƯỚC 02 <span>— TINH CHỈNH</span>
              </div>
              <div className="control-group">
                <div className="control-title">
                  <span>Phóng to / Thu nhỏ</span>
                  <strong>{Math.round(scale * 100)}%</strong>
                </div>
                <div className="range-row">
                  <ZoomOut size={18} />
                  <input
                    disabled={!userImage}
                    type="range"
                    min="0.6"
                    max="2.8"
                    step="0.01"
                    value={scale}
                    onChange={(e) => setScale(+e.target.value)}
                  />
                  <ZoomIn size={18} />
                </div>
              </div>
              <div className="control-group">
                <div className="control-title">
                  <span>Xoay ảnh</span>
                  <strong>{angle}°</strong>
                </div>
                <input
                  disabled={!userImage}
                  className="slider"
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={angle}
                  onChange={(e) => setAngle(+e.target.value)}
                />
              </div>
              <button
                className="reset"
                disabled={!userImage}
                onClick={() => {
                  setScale(1);
                  setAngle(0);
                  setOffset({ x: 0, y: 0 });
                }}
              >
                <RotateCcw size={16} /> Đặt lại điều chỉnh
              </button>
              <div className="step">
                BƯỚC 03 <span>— HOÀN TẤT</span>
              </div>
              <button
                className="primary full download"
                disabled={!userImage}
                onClick={download}
              >
                <Download size={20} /> Tải avatar chất lượng cao
              </button>
              <button className="secondary full" onClick={share}>
                <LinkIcon size={17} /> Chia sẻ link chiến dịch
              </button>
              <p className="disclaimer">
                Hãy tải ảnh xuống và cập nhật làm ảnh đại diện trên nền tảng bạn
                sử dụng.
              </p>
            </aside>
          </div>
        </main>
      ) : (
        <main>
          <section className="hero container">
            <div className="hero-copy">
              <div className="hero-pill">
                <span className="dot" /> THE HOABINH GROUP · SINCE 2008
              </div>
              <h1>
                Chất lượng
                <br />
                <em>tạo danh tiếng.</em>
              </h1>
              <p>
                The HBG hoạt động từ năm 2008 trong lĩnh vực hội nghị, sự kiện,
                du lịch và tea-break. Tạo ảnh đại diện mang dấu ấn sự kiện chỉ
                trong vài giây và cùng lan tỏa tinh thần thương hiệu.
              </p>
              <a className="primary" href="#campaigns">
                Khám phá khung avatar <span>↗</span>
              </a>
              <div className="trust">
                <Check size={16} /> Miễn phí <i /> Không cần đăng nhập <i /> Ảnh
                sắc nét
              </div>
            </div>
            <div className="hero-art">
              <div className="art-glow" />
              <div className="art-card">
                <div className="art-avatar">
                  <div className="art-person">✦</div>
                  <img src="/frames/welcome.svg" alt="Khung avatar sự kiện" />
                </div>
                <div className="art-caption">
                  <span className="avatar-dot" /> The HBG · Chất lượng tạo danh
                  tiếng <Check size={17} />
                </div>
              </div>
              <span className="floating floating-one">✦</span>
              <span className="floating floating-two">✦</span>
            </div>
          </section>
          <section id="campaigns" className="campaigns-section">
            <div className="container">
              <div className="eyebrow">EXPLORE CAMPAIGNS</div>
              <div className="section-header">
                <div>
                  <h2>Chọn khung. Tỏa sáng.</h2>
                  <p>Khám phá những chiến dịch đang chờ bạn tham gia.</p>
                </div>
                <span className="mode">
                  {campaigns.filter((c) => c.active !== false).length} khung khả
                  dụng
                </span>
              </div>
              <div className="cards">
                {campaigns
                  .filter((c) => c.active !== false)
                  .map((c) => (
                    <article
                      className="campaign-card"
                      key={c.id}
                      onClick={() => chooseCampaign(c)}
                    >
                      <div className="card-visual">
                        <div className="card-person">✦</div>
                        <img src={c.frame_url} alt={"Khung " + c.name} />
                      </div>
                      <div className="card-info">
                        <span className="live">
                          <span /> ĐANG DIỄN RA
                        </span>
                        <h3>{c.name}</h3>
                        <p>{c.subtitle || "Tạo dấu ấn cùng cộng đồng"}</p>
                        <button>
                          Tham gia chiến dịch <span>↗</span>
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            </div>
          </section>
          <section className="how container">
            <div className="eyebrow">HOW IT WORKS</div>
            <h2>Chỉ 3 bước đơn giản</h2>
            <div className="how-grid">
              <div>
                <span>01</span>
                <h3>Chọn khung</h3>
                <p>Khám phá bộ khung phù hợp với sự kiện yêu thích.</p>
              </div>
              <div>
                <span>02</span>
                <h3>Tải ảnh & chỉnh sửa</h3>
                <p>Căn chỉnh ảnh để tạo nên avatar của riêng bạn.</p>
              </div>
              <div>
                <span>03</span>
                <h3>Tải về & lan tỏa</h3>
                <p>Lưu PNG chất lượng cao và tự đặt làm ảnh đại diện.</p>
              </div>
            </div>
          </section>
        </main>
      )}
      <footer>
        <div className="container foot">
          <div className="foot-brand">
            <img src={hbgLogo} alt="The HBG" />
            <div>
              <b>THE HBG – THE HOABINH GROUP</b>
              <span>Chất lượng tạo danh tiếng</span>
            </div>
          </div>
          <div className="foot-contact">
            <a href="tel:0939311911">0939 311 911</a>
            <span>·</span>
            <a href="tel:0913311911">0913 311 911</a>
            <a href="mailto:info@hoabinh-group.com">info@hoabinh-group.com</a>
            <a
              href="https://hoabinh-group.com"
              target="_blank"
              rel="noreferrer"
            >
              hoabinh-group.com
            </a>
          </div>
        </div>
      </footer>
      {toast && (
        <div role="status" className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function mountApp() {
  let container = document.getElementById("root");

  if (!container) {
    container = document.createElement("div");
    container.id = "root";
    document.body.appendChild(container);
  }

  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountApp, { once: true });
} else {
  mountApp();
}
