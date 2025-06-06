const request = require("supertest");
const app = require("./getPendingTrx"); // Đảm bảo đường dẫn này đúng với file app.js của bạn

describe("GET /test endpoint", () => {
  // Test case 1: Chia cho 0
  test("should return an error when dividing by zero", async () => {
    const res = await request(app).get(
      "/test?number1=10&number2=0&operator=divide"
    );
    // Kiểm tra mã trạng thái HTTP là 400 (Bad Request)
    expect(res.statusCode).toEqual(400);
    // Kiểm tra xem phản hồi có chứa thông báo lỗi mong muốn không
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toBe("Không thể chia cho 0.");
  });

  // Test case 2: Toán tử không tồn tại (hoặc không hợp lệ)
  test("should return an error for an invalid operator", async () => {
    const res = await request(app).get(
      "/test?number1=5&number2=2&operator=modulus"
    );
    // Kiểm tra mã trạng thái HTTP là 400 (Bad Request)
    expect(res.statusCode).toEqual(400);
    // Kiểm tra xem phản hồi có chứa thông báo lỗi mong muốn không
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toBe(
      "Phép toán không hợp lệ. Chỉ chấp nhận plus, minus, multi, divide."
    );
  });

  // Test case 3: Cộng hai số nguyên dương
  test("should correctly add two positive integers", async () => {
    const res = await request(app).get(
      "/test?number1=5&number2=3&operator=plus"
    );
    expect(res.statusCode).toEqual(200); // 200 OK
    expect(res.body.calculatorResult).toEqual(8);
    expect(res.body.number1).toEqual(5);
    expect(res.body.number2).toEqual(3);
    expect(res.body.operator).toEqual("plus");
  });

  // Test case 4: Trừ hai số
  test("should correctly subtract two numbers", async () => {
    const res = await request(app).get(
      "/test?number1=10&number2=4&operator=minus"
    );
    expect(res.statusCode).toEqual(200);
    expect(res.body.calculatorResult).toEqual(6);
  });

  // Test case 5: Nhân hai số
  test("should correctly multiply two numbers", async () => {
    const res = await request(app).get(
      "/test?number1=6&number2=7&operator=multi"
    );
    expect(res.statusCode).toEqual(200);
    expect(res.body.calculatorResult).toEqual(42);
  });

  // Test case 6: Chia hai số
  test("should correctly divide two numbers", async () => {
    const res = await request(app).get(
      "/test?number1=20&number2=5&operator=divide"
    );
    expect(res.statusCode).toEqual(200);
    expect(res.body.calculatorResult).toEqual(4);
  });

  // Test case 7: Truyền giá trị không phải số cho number1
  test("should return an error if number1 is not a valid number", async () => {
    const res = await request(app).get(
      "/test?number1=abc&number2=5&operator=plus"
    );
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toBe("number1 và number2 phải là số hợp lệ.");
  });

  // Test case 8: Truyền giá trị không phải số cho number2
  test("should return an error if number2 is not a valid number", async () => {
    const res = await request(app).get(
      "/test?number1=5&number2=xyz&operator=minus"
    );
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error).toBe("number1 và number2 phải là số hợp lệ.");
  });

  // Test case 9: Cộng với số âm
  test("should correctly add with negative numbers", async () => {
    const res = await request(app).get(
      "/test?number1=10&number2=-3&operator=plus"
    );
    expect(res.statusCode).toEqual(200);
    expect(res.body.calculatorResult).toEqual(7);
  });

  // Test case 10: Chia số thập phân
  test("should correctly divide decimal numbers", async () => {
    const res = await request(app).get(
      "/test?number1=7.5&number2=2.5&operator=divide"
    );
    expect(res.statusCode).toEqual(200);
    expect(res.body.calculatorResult).toEqual(3);
  });
});

// npm test
