def hanoi(n, source, target, auxiliary):
    if n == 1:
        print(f"{source} → {target}")
    else:
        hanoi(n - 1, source, auxiliary, target)
        print(f"{source} → {target}")
        hanoi(n - 1, auxiliary, target, source)

hanoi(12, 'A', 'C', 'B')