package magnifier

import "testing"

func BenchmarkScaleBytes(b *testing.B) {
	a := make([]byte, 40000)
	b.ResetTimer()
	scaleBytes(a, 100, 200)
}
