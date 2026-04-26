export default function AdminHome() {
  return (
    <main style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ margin: "12px 0 16px" }}>Админка</h1>
      <ul>
        <li>
          <a href="/admin/hero">Hero</a>
        </li>
        <li>
          <a href="/admin/categories">Категории</a>
        </li>
        <li>
          <a href="/admin/products">Товары</a>
        </li>
        <li>
          <a href="/admin/raffle">Розыгрыш</a>
        </li>
        <li>
          <a href="/admin/orders">Заявки</a>
        </li>
      </ul>
    </main>
  );
}

