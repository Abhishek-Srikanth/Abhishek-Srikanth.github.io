with open("WDI_Trade_Data_2021Jun22_in.csv", "r") as f:
    lines = f.readlines()
with open("WDI_Trade_Data_2021Jun22.csv", "w") as f:
    f.write(lines[0])
    for line in lines:
        has_index = False
        for index in ["NE.TRD.GNFS.ZS", "NE.RSB.GNFS.ZS", "NE.IMP.GNFS.ZS", "NE.EXP.GNFS.ZS"]:
            if index in line:
                f.write(line)
