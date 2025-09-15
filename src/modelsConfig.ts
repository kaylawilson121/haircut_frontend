import HeadModel from "./components/ThreeD/Models/HeadModel";

export const ModelsConfig = {
    HeadModel: {
        name: 'HeadModel',
        modelPath: '/models/AS_Head.OBJ',
        scale: 4.319,
        arucoMarkerId: 501,
    },
    TrimmerModel: {
        name: 'TrimmerModel',
        modelPath: '/models/Hair_Trimmer.obj', // Fixed case to match actual file
        scale: 1.33,
        arucoMarkerId: 6,
    },
    HeadModelV2: {
        name: 'HeadModel',
        modelPath: '/models/3d_head.ply', // Fixed case to match actual file
        scale: 1.33,
        arucoMarkerId: 500,
    },
};
